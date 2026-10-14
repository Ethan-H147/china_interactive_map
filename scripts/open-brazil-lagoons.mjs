import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import osmtogeojson from 'osmtogeojson';
import {divisionBorders,internationalBorders} from './south-america-borders.mjs';

// Lagoa dos Patos, Lagoa Mirim and Lagoa Mangueira are water, not land. Without an
// inland-water layer they must show the ocean color, so they are cut out of every
// Brazilian land fill: states, DDD areas, Rio Grande do Sul municipalities and the
// country silhouette other countries show. Shores get no outline, like the coast.
// Patos and Mirim are IBGE's own operational lake areas (the build's simplified
// source, so shores share the municipalities' vertices); Mangueira is OSM 7438177.
const water='scripts/additional-sources/water/';
const fc=features=>({type:'FeatureCollection',features});
const round=c=>typeof c[0]==='number'?c.map(v=>Math.round(v*1e6)/1e6):c.map(round);
const ibge=JSON.parse(fs.readFileSync(water+'brazil-ibge-lagoons.geojson')).features;
assert.deepEqual(ibge.map(f=>String(f.properties.CD_MUN)).sort(),['4300001','4300002']);
const mangueira=osmtogeojson(JSON.parse(fs.readFileSync(water+'lagoa-mangueira-osm.json'))).features.filter(f=>/Polygon/.test(f.geometry.type));
assert.equal(mangueira.length,1,'Lagoa Mangueira is one OSM multipolygon');
const lagoons=fc([...ibge,...mangueira].map(f=>({type:'Feature',properties:{lagoon:String(f.properties.NM_MUN||f.properties.name).replace(/.*"(.*)".*/,'$1')},geometry:{type:f.geometry.type,coordinates:round(f.geometry.coordinates)}})));

const box=g=>{const b=[Infinity,Infinity,-Infinity,-Infinity];const w=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(w);};w(g.coordinates);return b;};
const waterBox=lagoons.features.map(f=>box(f.geometry)).reduce((a,b)=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])]);
const ringArea=r=>{let s=0;for(let i=1;i<r.length;i++)s+=(r[i-1][0]*r[i][1]-r[i][0]*r[i-1][1]);return Math.abs(s/2);};
const area=g=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).reduce((n,p)=>n+ringArea(p[0])-p.slice(1).reduce((m,h)=>m+ringArea(h),0),0);
const lagoonArea=lagoons.features.reduce((n,f)=>n+area(f.geometry),0);

async function erase(feature){
 const b=box(feature.geometry);
 if(b[2]<waterBox[0]||b[0]>waterBox[2]||b[3]<waterBox[1]||b[1]>waterBox[3])return feature;
 const out=await mapshaper.applyCommands('-i target.json water.json combine-files -erase target=target source=water -o format=geojson precision=0.000001',{'target.json':JSON.stringify(fc([feature])),'water.json':JSON.stringify(lagoons)});
 const result=JSON.parse(out['target.json']).features[0];
 const removed=area(feature.geometry)-area(result.geometry);
 if(removed<1e-6)return feature;
 assert(removed<=lagoonArea*1.001,'Only lagoon water may be removed');
 return {...feature,geometry:result.geometry};
}
async function eraseAll(collection){
 let changed=0;const features=[];
 for(const f of collection.features){const next=await erase(f);if(next!==f)changed++;features.push(next);}
 return {collection:{...collection,features},changed};
}
const read=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const write=(file,payload)=>{const json=JSON.stringify(payload),bytes=gzipSync(json,{level:9});fs.writeFileSync(file,bytes);return {bytes:bytes.length,decodedBytes:Buffer.byteLength(json)};};
const base='dist/data/south-america/';
const report={};
// Division files: cut the water, then redraw their shared borders from the result.
for(const file of ['brazil-first.bin','brazil-ddd.bin','brazil-local/BR-43.bin']){
 const payload=read(base+file),{collection,changed}=await eraseAll(payload.regions);
 report[file]=changed;if(!changed)continue;
 payload.regions=collection;payload.lines=divisionBorders(collection);
 const size=write(base+file,payload);
 if(file==='brazil-local/BR-43.bin'){const index=read(base+'brazil-local/index.bin');Object.assign(index.groups['BR-43'],size);write(base+'brazil-local/index.bin',index);}
 for(const [name,sources] of [['brazil-first.bin','brazil-sources.json'],['brazil-ddd.bin','brazil-ddd-sources.json']])if(file===name){const s=JSON.parse(fs.readFileSync(base+sources));fs.writeFileSync(base+sources,JSON.stringify({...s,...size},null,2)+'\n');}
}
// The silhouette Brazil shows in other countries' views.
const context=read('dist/data/flight-context.bin');
const brazil=context.features.findIndex(f=>f.properties.country==='brazil');
const opened=await erase(context.features[brazil]);report['flight-context.bin']=opened!==context.features[brazil]?1:0;
if(report['flight-context.bin'])context.features[brazil]=opened;
// Land borders follow the shared edges of the opened states: the stretch of the
// Brazil–Uruguay boundary inside Lagoa Mirim is water and is no longer drawn.
const landBorders=internationalBorders(fc(['brazil','uruguay','argentina'].flatMap(c=>read(base+c+'-first.bin').regions.features)));
const bordersChanged=JSON.stringify(landBorders)!==JSON.stringify(context.landBorders);report.landBorders=bordersChanged?1:0;
if(bordersChanged)context.landBorders=landBorders;
if(report['flight-context.bin']||bordersChanged)fs.writeFileSync('dist/data/flight-context.bin',gzipSync(JSON.stringify(context),{level:9}));
console.log('Opened Lagoa dos Patos, Lagoa Mirim and Lagoa Mangueira; features changed:',JSON.stringify(report));
