import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';
import {transformFeature} from './coordinates.mjs';
const sourceDir='scripts/additional-sources/city-districts/';
const display=readData('display-boundaries.json');
const codes=[330100,320100,320500,440100,440300];
const raw=fs.readFileSync(sourceDir+'areacity-records.csv','utf8');
const countyFeatures=raw.trim().split(/\r?\n/).map(line=>{
  const c=[...line.matchAll(/"([^"]*)"|([^,]+)/g)].map(m=>m[1]??m[2]);
  const [code,parent,,name,,center,shape]=c;
  const coordinates=shape.split(';').map(p=>p.split('~').map(r=>{const ring=r.split(',').map(p=>p.trim().split(/\s+/).map(Number));if(JSON.stringify(ring[0])!==JSON.stringify(ring.at(-1)))ring.push([...ring[0]]);return ring;}));
  const city=Number(parent)*100;
  return transformFeature({type:'Feature',properties:{adcode:Number(code),name,level:'city-district',parentCity:city,parent:{adcode:city},provinceCode:Math.floor(Number(code)/10000)*10000,adminType:name.endsWith('区')?'District':name.endsWith('县')?'County':'County-level City',center:center.split(' ').map(Number)},geometry:{type:'MultiPolygon',coordinates}});
});
const fc=features=>({type:'FeatureCollection',features});
const run=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o output.json format=geojson geojson-type=FeatureCollection',files))['output.json']);
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const area=g=>polygons(g).reduce((s,p)=>s+p.reduce((a,r,i)=>a+(i?-1:1)*Math.abs(r.slice(1).reduce((t,b,j)=>t+(r[j][0]-r[0][0])*(b[1]-r[0][1])-(b[0]-r[0][0])*(r[j][1]-r[0][1]),0)/2),0),0);
const features=[],lines=[],report=[];
for(const code of codes){
  const parent=display.subdivisions.features.find(f=>f.properties.adcode===code);
  const source=countyFeatures.filter(f=>f.properties.parentCity===code);
  const datav=JSON.parse(fs.readFileSync(sourceDir+`datav-${code}.json`));
  const primary=await run('-i input.json -clean gap-width=250m overlap-rule=min-area -clip parent.json',{'input.json':fc(source),'parent.json':parent});
  // Use DataV only where the newer county source does not cover the retained
  // city extent. This preserves AreaCity's detailed internal boundaries.
  const fallback=fc(datav.features.map(transformFeature).map(f=>({...f,properties:{...source.find(s=>s.properties.adcode===f.properties.adcode).properties}})));
  const extra=await run('-i fallback.json -clip parent.json -erase primary.json',{'fallback.json':fallback,'parent.json':parent,'primary.json':primary});
  const clean=await run('-i input.json -clean gap-width=250m overlap-rule=min-area -dissolve2 adcode copy-fields=name,level,parentCity,parent,provinceCode,adminType,center',{'input.json':fc([...primary.features,...extra.features])});
  const remaining=await run('-i parent.json -erase children.json',{'parent.json':parent,'children.json':clean});
  const gapArea=remaining.features.reduce((s,f)=>s+area(f.geometry),0);
  const points=await run('-i input.json -points inner',{'input.json':clean});
  for(let i=0;i<clean.features.length;i++)clean.features[i].properties.centroid=points.features[i].geometry.coordinates;
  const top=topology({regions:clean});
  lines.push({type:'Feature',properties:{parentCity:code},geometry:mesh(top,top.objects.regions,(a,b)=>a!==b)});
  features.push(...clean.features);
  report.push({city:code,districts:source.length,datavDistricts:datav.features.length,matchingCodes:source.every(f=>datav.features.some(d=>d.properties.adcode===f.properties.adcode)),uncoveredFraction:gapArea/area(parent.geometry),reference:'DataV county boundaries and AreaCity 2025.251231.260403'});
}
const dataset={regions:fc(features),boundaries:fc(lines)};
fs.writeFileSync('dist/data/city-districts.bin',gzipSync(JSON.stringify(dataset),{level:9}));
const sources=fs.readdirSync(sourceDir).map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(sourceDir+file)).digest('hex')}));
fs.writeFileSync('dist/data/city-district-sources.json',JSON.stringify({checked:'2026-10-04',provider:'AreaCity / Amap and Tencent with DataV coverage fallback',release:'https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov/releases/tag/2025.251231.260403',license:'AreaCity: MIT; DataV: original provider terms',datav:'https://geo.datav.aliyun.com/areas_v3/bound/',coordinateSystem:'WGS84',method:'Compare county codes with DataV. Reconcile AreaCity shared edges without simplification and clip to the retained city extent. Use DataV county geometry only for uncovered areas. Residual uncovered edge areas continue to select the parent city.',cities:report,sources},null,2));
console.log(JSON.stringify(report,null,2));
