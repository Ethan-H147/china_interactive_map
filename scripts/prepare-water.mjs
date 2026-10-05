import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';
import {reconcileRiverBoundaries} from './reconcile-river-boundaries.mjs';

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
// Natural Earth's 1:10M Yangtze centerline stops near Zhenjiang and omits
// the lower river and estuary from this line-only dataset.
// Continue it with the mapped OSM river, retaining its downstream branches.
const yangtzeFile=new URL('osm-yangtze.geojson',snapshot);
const yangtzeBytes=fs.readFileSync(yangtzeFile);
const yangtzeSource=JSON.parse(yangtzeBytes).features[0];
const mappedLines=yangtzeSource.geometry.coordinates;
const main=mappedLines.reduce((a,b)=>a.length>b.length?a:b);
const naturalYangtze=riverData.features.find(f=>f.properties.name==='Yangtze');
const naturalLines=naturalYangtze.geometry.coordinates;
const endpoints=naturalLines.flatMap(line=>[{line,index:0,point:line[0]},{line,index:line.length-1,point:line.at(-1)}]);
const mouth=endpoints.reduce((a,b)=>a.point[0]>b.point[0]?a:b);
const xScale=Math.cos(mouth.point[1]*Math.PI/180);
let join={distance:Infinity};
for(let i=0;i<main.length-1;i++){
  const a=main[i],b=main[i+1],dx=(b[0]-a[0])*xScale,dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((mouth.point[0]-a[0])*xScale*dx+(mouth.point[1]-a[1])*dy)/(dx*dx+dy*dy)));
  const point=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];
  const distance=Math.hypot((point[0]-mouth.point[0])*xScale,point[1]-mouth.point[1])*111320;
  if(distance<join.distance)join={point,index:i,distance};
}
if(join.distance>2000)throw Error('Yangtze sources no longer align within 2 km; review the source update');
// Snap only the generalized endpoint to the mapped centerline (849 m in this
// snapshot), so the join is continuous without drawing a connecting segment.
mouth.line[mouth.index]=join.point;
const before=main.slice(0,join.index+1),after=main.slice(join.index+1);
const downstream=Math.max(...after.map(p=>p[0]))>Math.max(...before.map(p=>p[0]))?after:before.reverse();
const estuaryLines=[[join.point,...downstream],...mappedLines.filter(line=>line!==main&&line.every(p=>p[0]>join.point[0]))];
sources.push({url:'https://www.openstreetmap.org/relation/9392345',download:yangtzeSource.properties.source,snapshot:'osm-yangtze.geojson',sha256:createHash('sha256').update(yangtzeBytes).digest('hex'),license:'ODbL 1.0',licenseUrl:'https://opendatacommons.org/licenses/odbl/1-0/',attribution:'© OpenStreetMap contributors',selection:'Lower Yangtze continuation and mapped estuary branches',joinAdjustmentMetres:Math.round(join.distance)});
// A small corridor preserves border rivers despite differing generalization in
// the two sources. It does not change administrative or selectable geometry.
const display=readData('display-boundaries.json');
const provinces=display.provinces;
const mask=structuredClone(provinces);
for(const f of mask.features){
  const g=f.geometry;
  if(g.type==='Polygon')g.coordinates=[g.coordinates[0]];
  else g.coordinates=g.coordinates.map(p=>[p[0]]);
}
const buffered=await mapshaper.applyCommands('-i mask.json -dissolve -simplify dp interval=1000 keep-shapes -buffer 5000 -o mask.json format=geojson',{'mask.json':mask});
const clipped=await mapshaper.applyCommands('-i rivers.json -clip mask.json -o rivers.json format=geojson geojson-type=FeatureCollection',{'rivers.json':riverData,'mask.json':buffered['mask.json']});
const features=JSON.parse(clipped['rivers.json']).features.map(f=>({...f,properties:{kind:'river',name:f.properties.name,sourceId:f.properties.dissolve,rank:f.properties.scalerank}}));
// Estuary channels reach open water and must not be clipped by the land mask.
features.push({type:'Feature',properties:{kind:'river',name:'Yangtze',sourceId:'osm-relation-9392345',rank:1},geometry:{type:'MultiLineString',coordinates:estuaryLines}});
// Show the entire water body for the shared international lake, Khanka.
features.push(...lakeData.features.map(f=>({...f,properties:{kind:'lake',name:f.properties.name_en||f.properties.name,zh:f.properties.name_zh,sourceId:String(f.properties.ne_id),rank:f.properties.scalerank}})));
const dishuiFile=new URL('dishui-lake.geojson',snapshot),dishuiBytes=fs.readFileSync(dishuiFile),dishui=JSON.parse(dishuiBytes);
features.push(dishui);
sources.push({url:'https://www.openstreetmap.org/relation/5606982',snapshot:'dishui-lake.geojson',sha256:createHash('sha256').update(dishuiBytes).digest('hex'),license:'ODbL 1.0',licenseUrl:'https://www.openstreetmap.org/copyright',selection:'Dishui Lake water polygon with its interior islands',metadata:'data/dishui-lake-source.json'});
const aligned=reconcileRiverBoundaries(features,display);
// Preserve the independent overlay for audits and regression checks.
fs.writeFileSync(new URL('dist/data/major-water-original.bin',root),gzipSync(JSON.stringify({type:'FeatureCollection',features}),{level:9}));
const collection={type:'FeatureCollection',features:aligned.features};
fs.writeFileSync(new URL('dist/data/river-boundary-report.json',root),JSON.stringify(aligned.report,null,2)+'\n');
// Keep copied shared-edge vertices exact; rounding only the river would create
// another difference from the administrative geometry at close zoom levels.
const json=JSON.stringify(collection);
fs.writeFileSync(new URL('dist/data/major-water.bin',root),gzipSync(json,{level:9}));
const metadata={source:'Natural Earth and OpenStreetMap contributors',release:'Natural Earth 5.1.2; OSM snapshot '+yangtzeSource.properties.retrieved,license:'ODbL 1.0; underlying Natural Earth features are public domain',licenseUrl:'https://opendatacommons.org/licenses/odbl/1-0/',coordinateSystem:'WGS84',scale:'Natural Earth 1:10,000,000 with mapped OSM lower Yangtze and Dishui Lake',coverage:'Selected major rivers, lakes and reservoirs in China. Natural Earth river courses are clipped to the existing China extent with a 5 km corridor for international border rivers. The lower Yangtze and its estuary branches continue to open water using OpenStreetMap; these are not clipped to land. Lake Khanka is shown in full. Dishui Lake retains its mapped water edge and interior islands. These features are for geographic context, not current water levels.',sources,riverSections:features.filter(f=>f.properties.kind==='river').length,lakes:features.filter(f=>f.properties.kind==='lake').length};
metadata.reconciliation={report:'data/river-boundary-report.json',originalOverlay:'data/major-water-original.bin',method:aligned.report.method,alignedKilometres:aligned.report.alignedKilometres};
fs.writeFileSync(new URL('dist/data/major-water-sources.json',root),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({riverSections:metadata.riverSections,lakes:metadata.lakes,compressedBytes:gzipSync(json,{level:9}).length}));
