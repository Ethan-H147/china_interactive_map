// Display mesh repair for Saint Petersburg's OSM districts against the atlas coast.
// Keeps all 18 source polygons and identities. Only shared display lines change.
import fs from 'node:fs';import{gzipSync}from'node:zlib';import{fileURLToPath}from'node:url';
import{divisionBorders}from'./south-america-borders.mjs';
import{command}from'./build-regional-dataset.mjs';
import{load,polygons,metres,lineIndex}from'./geo-index.mjs';
const fc=features=>({type:'FeatureCollection',features}),paths=g=>g.type==='LineString'?[g.coordinates]:g.coordinates,key=p=>p.map(n=>n.toFixed(6)).join(',');
export async function petersburgDistrictBorders(regions,parent){
 const coast=polygons(parent.geometry).flat(),near=lineIndex(coast),shared=divisionBorders(regions);
 // Clip using the same coast as this resolution; no channel heuristics in open bay water.
 const clipped=await command({'lines.json':shared,'coast.json':fc([parent])},'-clip coast.json');
 const lines=clipped.features.flatMap(f=>paths(f.geometry).map(coordinates=>({owners:f.properties.regionIds,coordinates}))),degree=new Map();
 for(const {coordinates:l}of lines)for(const p of[l[0],l.at(-1)])degree.set(key(p),(degree.get(key(p))||0)+1);
 const extensions=[];
 for(const line of lines)for(const reverse of[false,true]){
  const l=reverse?[...line.coordinates].reverse():line.coordinates,p=l[0];if(degree.get(key(p))!==1||near(p)<.2)continue;
  let i=1;while(i<l.length-1&&metres(p,l[i])<100)i++;const q=l[i],dx=p[0]-q[0],dy=p[1]-q[1];let nearest=null;
  for(const r of coast)for(let j=1;j<r.length;j++){
   const a=r[j-1],b=r[j],ex=b[0]-a[0],ey=b[1]-a[1],den=dx*ey-dy*ex;if(Math.abs(den)<1e-15)continue;
   const ax=a[0]-p[0],ay=a[1]-p[1],t=(ax*ey-ay*ex)/den,u=(ax*dy-ay*dx)/den;
   if(t<=0||u<0||u>1)continue;const point=[p[0]+t*dx,p[1]+t*dy],distance=metres(p,point);
   if(distance<=2000&&(!nearest||distance<nearest.distance))nearest={point,distance};
  }
  if(!nearest)throw Error('Unconnected inland Saint Petersburg boundary: '+key(p));
  if(reverse)line.coordinates.push(nearest.point);else line.coordinates.unshift(nearest.point);
  extensions.push({owners:line.owners,from:p,to:nearest.point,metres:nearest.distance});
 }
 return {boundaries:fc(lines.map(l=>({type:'Feature',properties:{owners:l.owners},geometry:{type:'MultiLineString',coordinates:[l.coordinates]}}))),extensions};
}
export async function repairPetersburgBorders(){
 const base='dist/data/russia/',report={};
 for(const prefix of['','lite/']){
  const file=base+prefix+'second/RU-SPE.bin';if(!fs.existsSync(file)||!fs.existsSync(base+prefix+'first.bin'))continue;
  const data=load(file),parent=load(base+prefix+'first.bin').regions.features.find(f=>f.properties.id==='RU-SPE');
  const result=await petersburgDistrictBorders(data.regions,parent);data.boundaries=result.boundaries;
  const json=JSON.stringify(data),bytes=gzipSync(json,{level:9});fs.writeFileSync(file,bytes);report[prefix||'full']={lines:data.boundaries.features.length,extensions:result.extensions};
  if(!prefix){const catalogue=load(base+'catalogue.bin');Object.assign(catalogue.chunks['RU-SPE'],{bytes:bytes.length,decodedBytes:Buffer.byteLength(json)});fs.writeFileSync(base+'catalogue.bin',gzipSync(JSON.stringify(catalogue),{level:9}));}
 }
 fs.mkdirSync('artifacts/petersburg-coast',{recursive:true});fs.writeFileSync('artifacts/petersburg-coast/report.json',JSON.stringify(report,null,2));
 console.log('Saint Petersburg shared lines meet their full/lite coast; detached channel fragments removed.',Object.fromEntries(Object.entries(report).map(([k,v])=>[k,{lines:v.lines,extensions:v.extensions.length}])));return report;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1]))await repairPetersburgBorders();
