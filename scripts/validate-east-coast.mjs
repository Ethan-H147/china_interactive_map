// Taiwan precision reconciliation has source-preservation checks in validate-taiwan.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
import {polygons} from './international-topology.mjs';
import {eastChangedCodes,contains} from './east-coast.mjs';
import {area,run,collection} from './pearl-coast.mjs';
import {segmentDistanceIndex} from './shenzhen-hongkong.mjs';
const baseline='3fca3014603c67d0921d63811345e87c1a823cb6',show=name=>{const r=spawnSync('git',['-c','safe.directory='+process.cwd().replaceAll('\\','/'),'show',baseline+':dist/data/'+name],{maxBuffer:60e6});assert.equal(r.status,0);return r.stdout;};
const m=JSON.parse(show('display-boundaries.parts.json')),before=JSON.parse(gunzipSync(Buffer.concat(m.parts.map(show)))),after=readData('display-boundaries.json');
const changed=new Set([...eastChangedCodes,440400]);let untouched=0;
for(const f of before.subdivisions.features){const next=after.subdivisions.features.find(g=>g.properties.adcode===f.properties.adcode);assert.deepEqual(next.properties,f.properties);if(f.properties.provinceCode!==710000&&!changed.has(f.properties.adcode)){assert.deepEqual(next,f,'Unrelated region changed '+f.properties.adcode);untouched++;}}
for(const f of before.provinces.features)if(![310000,330000,440000,710000].includes(f.properties.adcode))assert.deepEqual(after.provinces.features.find(g=>g.properties.adcode===f.properties.adcode),f,'Unrelated province changed');
for(const name of ['city-districts.bin','korea-boundaries.bin','korea-outline.bin','sar-810000.json','sar-820000.json'])assert.deepEqual(fs.readFileSync('dist/data/'+name),show(name),'Protected geometry changed '+name);
const source=readData('east-coast-source.json'),raw=gunzipSync(fs.readFileSync('dist/data/east-coast-source.bin')),osm=JSON.parse(raw),land=JSON.parse(gunzipSync(fs.readFileSync('dist/data/east-coast-land.bin'))),report=readData('east-coast-report.json');
assert.equal(source.sha256,createHash('sha256').update(raw).digest('hex'));
const key=p=>p.map(n=>n.toFixed(8)).join(','),sourceKeys=new Set(osm.elements.flatMap(w=>w.geometry.map(p=>key([p.lon,p.lat]))));
const sum=fc=>fc.features.reduce((s,f)=>s+(f.geometry?area(f.geometry):0),0),oldTop=topology({regions:before.subdivisions}),counts=[];let sharedSamples=0;
for(const code of eastChangedCodes){
 const city=after.subdivisions.features.find(f=>f.properties.adcode===code),old=before.subdivisions.features.find(f=>f.properties.adcode===code),vertices=polygons(city.geometry).flat(2),keys=new Set(vertices.map(key));
 for(const r of polygons(city.geometry).flat()){assert.deepEqual(r[0],r.at(-1));assert(r.every(p=>p.every(Number.isFinite)));}
 // Nanhui tidal-flat vertices are replaced by separately validated seawall edges.
 const retained=vertices.filter(p=>sourceKeys.has(key(p))).length;
 assert(retained>({310113:700,310115:1700,310116:300,310120:400,310151:2000,330900:50000}[code]),'Insufficient original shoreline detail '+code);
 const stats=report.regions.find(r=>r.adcode===code);
 for(const id of stats.wholeIslandIds)for(const p of polygons(land.features[id].geometry).flat(2))assert(keys.has(key(p)),'Whole island source vertex missing '+code+' '+id+' '+p);
 const neighbors=collection(after.subdivisions.features.filter(f=>f.properties.adcode!==code&&[310000,320000,330000].includes(f.properties.provinceCode))),priorNeighbors=collection(before.subdivisions.features.filter(f=>f.properties.adcode!==code&&[310000,320000,330000].includes(f.properties.provinceCode)));
 const overlap=sum(await run('-i city.json -clip neighbors.json',{'city.json':city,'neighbors.json':neighbors})),prior=sum(await run('-i city.json -clip neighbors.json',{'city.json':old,'neighbors.json':priorNeighbors}));
 assert(overlap<=prior+1e-10,'New neighbor overlap '+code);
 assert(Math.abs(sum(await run('-i city.json -clean gap-width=0',{'city.json':city}))-area(city.geometry))<1e-10,'Invalid polygon '+code);
 const shared=mesh(oldTop,oldTop.objects.regions,(a,b)=>a!==b&&(a.properties.adcode===code||b.properties.adcode===code)),distance=segmentDistanceIndex(polygons(city.geometry).flat());
 for(const line of shared.coordinates)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],p=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  if(land.features.some(f=>contains(f,p))){assert(distance(p)<.02,'Shared inland edge moved '+code+' '+p);sharedSamples++;}
 }
 counts.push({code,parts:polygons(city.geometry).length,vertices:vertices.length,originalCoastVertices:retained});
}
// Main Chongming and its Jiangsu split stay exact; Changxing and Hengsha improve.
const main=f=>polygons(f.geometry).filter(p=>p[0].some(c=>c[1]>31.6));
const edgeHash=ps=>createHash('sha256').update(ps.flatMap(p=>p.flatMap(r=>r.slice(1).map((b,i)=>[JSON.stringify(r[i]),JSON.stringify(b)].sort().join('|')))).sort().join('\n')).digest('hex');
assert.equal(edgeHash(main(after.subdivisions.features.find(f=>f.properties.adcode===310151))),edgeHash(main(before.subdivisions.features.find(f=>f.properties.adcode===310151))),'Every main Chongming edge remains exact');
const owner=p=>after.subdivisions.features.filter(f=>contains(f,p)).map(f=>f.properties.adcode);
const checkpoints=JSON.parse(fs.readFileSync('scripts/additional-sources/east-coast/island-catalogue.json')).entries.filter(e=>['舟山岛','朱家尖岛','岱山岛'].includes(e.name));
assert.equal(checkpoints.length,3);for(const e of checkpoints)assert.deepEqual(owner(e.point),[330900],e.name+' jurisdiction');
assert(report.catalogueMatches.filter(m=>m.added).length>50,'Officially identified missing islands should be restored');
for(const p of [[122.6,30.3],[123.0,29.6],[122.05,30.9]])assert.deepEqual(owner(p),[],'Open sea filled '+p);
// Reproduce the Hengqin screenshot: no artificial 22.08° crop edges may remain.
const zhuhai=after.subdivisions.features.find(f=>f.properties.adcode===440400),pearl=JSON.parse(gunzipSync(fs.readFileSync('dist/data/pearl-coast-source.bin'))),coastDistance=segmentDistanceIndex(pearl.elements.map(w=>w.geometry.map(p=>[p.lon,p.lat])));
let hengqinSamples=0;
const outerTop=topology({regions:after.subdivisions}),outer=mesh(outerTop,outerTop.objects.regions,(a,b)=>a===b&&a.properties.adcode===440400);
const retainedMacau=segmentDistanceIndex(after.subdivisions.features.filter(f=>f.properties.provinceCode===820000).flatMap(f=>polygons(f.geometry).flat()));
for(const r of outer.coordinates)for(let i=1;i<r.length;i++){
 const a=r[i-1],b=r[i];
 assert(!(Math.abs(a[1]-22.08)<1e-8&&Math.abs(b[1]-22.08)<1e-8&&Math.max(a[0],b[0])>113.48&&Math.min(a[0],b[0])<113.61),'Artificial Hengqin latitude cutoff remains');
 const p=[(a[0]+b[0])/2,(a[1]+b[1])/2];
 if(p[0]>113.52&&p[0]<113.58&&p[1]>22.045&&p[1]<22.125){assert(coastDistance(p)<.02||retainedMacau(p)<.02,'Hengqin bay still has an unsourced coastal detour '+p);hengqinSamples++;}
}
assert(hengqinSamples>300,'Hengqin shoreline checks missing');
const water=JSON.parse(gunzipSync(fs.readFileSync('dist/data/major-water.bin'))),previousWater=JSON.parse(gunzipSync(show('major-water.bin'))),oldRivers=previousWater.features.filter(f=>f.properties.kind==='river'),newRivers=water.features.filter(f=>f.properties.kind==='river');
assert.deepEqual(newRivers,oldRivers,'Existing river geometry must stay exact');
assert.deepEqual(water.features.filter(f=>f.properties.kind==='lake'&&f.properties.sourceId!=='osm-relation-5606982'),previousWater.features.filter(f=>f.properties.kind==='lake'),'Existing lake geometry stays exact');
console.log(JSON.stringify({untouchedRegions:untouched,unchangedProvinces:31,sharedInlandSamples:sharedSamples,hengqinShorelineSamples:hengqinSamples,coastlines:counts,dishuiAdded:true}));
