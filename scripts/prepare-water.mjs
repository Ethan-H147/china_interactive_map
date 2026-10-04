import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';

const root=new URL('../',import.meta.url);
const snapshot=new URL('scripts/additional-sources/water/',root);
fs.mkdirSync(snapshot,{recursive:true});
const base='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/';
// Explicit selection avoids filling the map with every available tributary.
const rivers=new Set(['Tuotuo','Tongtian','Jinsha','Chang Jiang','Yangtze','Huang','Nanpan','Hongshui','Xun','Xi','Bei','Dong','Heilong Jiang','Amur','Songhua','Di’er Songhua','Nen','Ussuri','Liao','Xiliao','Huai','Hai','Yongding','Han','Min','Fuchun','Lancang','Za','Nu','Yarlung','Maquan','Tarim','Yarkant','Aksu','Ile','Künes','Ertix','Jialing','Yalong','Gan','Xiang','Yuan','Wei','Yalu']);
const lakes=new Set(['Qinghai Hu','Poyang Hu','Dongting Hu','Tai Hu','Hongze Hu','Hulun Nuur','Bosten Hu','Nam Co','Siling Co','Chao Hu','Lake Khanka','Weishan Hu','Ebinur Hu','Ngoring Hu','Gyaring Hu','Yamzho Yumco','Mapam Yumco','Tangra Yumco','Xinanjiang Shuiku','Danjiangkou Shuiku']);
const sources=[];
async function selectedSource(kind,names){
  const filename=`ne_10m_${kind}.geojson`,url=base+filename,file=new URL(filename,snapshot);
  if(!fs.existsSync(file)){
    const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);
    const data=await response.json();
    data.features=data.features.filter(f=>names.has(f.properties.name)&&!(f.properties.name==='Han'&&f.properties.rivernum!==270));
    fs.writeFileSync(file,JSON.stringify(data));
  }
  const bytes=fs.readFileSync(file),data=JSON.parse(bytes);
  sources.push({url,snapshot:path.basename(file.pathname),sha256:createHash('sha256').update(bytes).digest('hex'),selection:[...names]});
  return data;
}
const [riverData,lakeData]=await Promise.all([selectedSource('rivers_lake_centerlines',rivers),selectedSource('lakes',lakes)]);
// A small corridor preserves border rivers despite differing generalization in
// the two sources. It does not change administrative or selectable geometry.
const provinces=readData('display-boundaries.json').provinces;
const mask=structuredClone(provinces);
for(const f of mask.features){
  const g=f.geometry;
  if(g.type==='Polygon')g.coordinates=[g.coordinates[0]];
  else g.coordinates=g.coordinates.map(p=>[p[0]]);
}
const buffered=await mapshaper.applyCommands('-i mask.json -dissolve -simplify dp interval=1000 keep-shapes -buffer 5000 -o mask.json format=geojson',{'mask.json':mask});
const clipped=await mapshaper.applyCommands('-i rivers.json -clip mask.json -o rivers.json format=geojson geojson-type=FeatureCollection',{'rivers.json':riverData,'mask.json':buffered['mask.json']});
const features=JSON.parse(clipped['rivers.json']).features.map(f=>({...f,properties:{kind:'river',name:f.properties.name,sourceId:f.properties.dissolve,rank:f.properties.scalerank}}));
// Show the entire water body for the shared international lake, Khanka.
features.push(...lakeData.features.map(f=>({...f,properties:{kind:'lake',name:f.properties.name_en||f.properties.name,zh:f.properties.name_zh,sourceId:String(f.properties.ne_id),rank:f.properties.scalerank}})));
const collection={type:'FeatureCollection',features};
const json=JSON.stringify(collection,(key,value)=>typeof value==='number'&&!Number.isInteger(value)?Math.round(value*1e6)/1e6:value);
fs.writeFileSync(new URL('dist/data/major-water.bin',root),gzipSync(json,{level:9}));
const metadata={source:'Natural Earth',release:'5.1.2',license:'Public domain',coordinateSystem:'WGS84',scale:'1:10,000,000',coverage:'Selected major rivers, lakes and reservoirs in China. River courses are clipped to the existing China extent with a 5 km corridor for international border rivers. Lake Khanka is shown in full. These generalized features are for geographic context, not detailed shorelines or current water levels.',sources,riverSections:features.filter(f=>f.properties.kind==='river').length,lakes:lakeData.features.length};
fs.writeFileSync(new URL('dist/data/major-water-sources.json',root),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({riverSections:metadata.riverSections,lakes:metadata.lakes,compressedBytes:gzipSync(json,{level:9}).length}));
