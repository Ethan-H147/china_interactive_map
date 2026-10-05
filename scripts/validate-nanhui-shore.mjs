import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
import {nanhuiSource,refineNanhuiShore} from './nanhui-shore.mjs';
import {contains} from './east-coast.mjs';
import {area,run,collection} from './pearl-coast.mjs';
import {polygons} from './international-topology.mjs';
import {segmentDistanceIndex} from './shenzhen-hongkong.mjs';
const baseline='84fc6a774627bbf164c79df37ece8dddd9958553',show=name=>{const r=spawnSync('git',['-c','safe.directory='+process.cwd().replaceAll('\\','/'),'show',baseline+':dist/data/'+name],{maxBuffer:60e6});assert.equal(r.status,0);return r.stdout;};
const manifest=JSON.parse(show('display-boundaries.parts.json')),before=JSON.parse(gunzipSync(Buffer.concat(manifest.parts.map(show)))),after=readData('display-boundaries.json'),source=nanhuiSource();
let unchanged=0;for(const f of before.subdivisions.features){const n=after.subdivisions.features.find(g=>g.properties.adcode===f.properties.adcode);assert.deepEqual(n.properties,f.properties);if(f.properties.adcode!==310115){assert.deepEqual(n,f);unchanged++;}}
for(const f of before.provinces.features)if(f.properties.adcode!==310000)assert.deepEqual(after.provinces.features.find(g=>g.properties.adcode===f.properties.adcode),f);
const city=after.subdivisions.features.find(f=>f.properties.adcode===310115),old=before.subdivisions.features.find(f=>f.properties.adcode===310115),total=fc=>fc.features.reduce((s,f)=>s+(f.geometry?area(f.geometry):0),0);
assert(area(city.geometry)<area(old.geometry),'Mudflat correction must remove area');
const removedKm2=(area(old.geometry)-area(city.geometry))*111.32**2*Math.cos(30.96*Math.PI/180);
assert(removedKm2>35&&removedKm2<50,'Unexpected reviewed tidal-flat extent');
assert(total(await run('-i new.json -erase old.json',{'new.json':city,'old.json':old}))<1e-11,'No dry land invented outside the previous extent');
const removed=await run('-i old.json -erase new.json',{'old.json':old,'new.json':city});
assert(total(await run('-i removed.json -erase reviewed.json',{'removed.json':removed,'reviewed.json':source.cut}))<1e-11,'Change outside reviewed stretch');
for(const p of [[121.980,30.943],[121.970,30.974],[121.963,30.993],[121.983,30.928]])assert(!contains(city,p),'Exposed tidal flat still filled '+p);
for(const p of [[121.940,30.972],[121.955,30.942],[121.968,30.921],[121.955,30.906]])assert(contains(city,p),'Permanent reclaimed land removed '+p);
const distance=segmentDistanceIndex(polygons(city.geometry).flat());let shorelineChecks=0;
for(let i=1;i<source.shore.length;i++){const a=source.shore[i-1],b=source.shore[i];for(const t of [.25,.5,.75]){const p=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];if(!source.structures.features.some(f=>contains(f,p))){assert(distance(p)<.03,'Seawall edge missing '+p);shorelineChecks++;}}}
const oldTop=topology({regions:before.subdivisions}),shared=mesh(oldTop,oldTop.objects.regions,(a,b)=>a!==b&&(a.properties.adcode===310115||b.properties.adcode===310115));
for(const line of shared.coordinates)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],p=[(a[0]+b[0])/2,(a[1]+b[1])/2];assert(distance(p)<.03,'Inland shared edge moved');}
for(const structure of source.structures.features){const previous=await run('-i structure.json -clip old.json',{'structure.json':structure,'old.json':old}),missing=await run('-i structure.json -erase city.json',{'structure.json':previous,'city.json':city});assert(total(missing)<1e-11,'Mapped permanent breakwater removed');}
const rawShore=JSON.parse(gunzipSync(fs.readFileSync('dist/data/nanhui-shore-source.bin')));
for(const id of source.metadata.excludedTidalDikes){const w=rawShore.elements.find(e=>e.id===id),dike={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[w.geometry.map(p=>[p.lon,p.lat])]}};
 const inReview=await run('-i dike.json -clip reviewed.json',{'dike.json':dike,'reviewed.json':source.cut});
 assert(total(await run('-i dike.json -clip city.json',{'dike.json':inReview,'city.json':city}))<1e-11,'Tidal dike still contributes land');}
assert(Math.abs(total(await run('-i city.json -clean gap-width=0',{'city.json':city}))-area(city.geometry))<1e-11,'Invalid land polygon');
for(const name of ['city-districts.bin','korea-boundaries.bin','sar-810000.json','sar-820000.json','dishui-lake.json'])assert.deepEqual(fs.readFileSync('dist/data/'+name),show(name),'Unrelated data changed '+name);
const priorWater=JSON.parse(gunzipSync(show('major-water.bin'))),water=JSON.parse(gunzipSync(fs.readFileSync('dist/data/major-water.bin')));assert.deepEqual(water,priorWater,'Existing waterways and Dishui Lake must remain exact');
assert.equal(readData('nanhui-shore.json').sha256,createHash('sha256').update(gunzipSync(fs.readFileSync('dist/data/nanhui-shore-source.bin'))).digest('hex'));
const repeated=await refineNanhuiShore(after.subdivisions.features),edgeHash=g=>createHash('sha256').update(polygons(g).flat().flatMap(r=>r.slice(1).map((b,i)=>[JSON.stringify(r[i]),JSON.stringify(b)].sort().join('|'))).sort().join('\n')).digest('hex');
assert.equal(edgeHash(repeated.features.find(f=>f.properties.adcode===310115).geometry),edgeHash(city.geometry),'Repeated build changes coastline');
console.log(JSON.stringify({unchangedRegions:unchanged,unchangedProvinces:33,shorelineChecks,tidalFlatsExcluded:true,raisedHarborRetained:true,tidalDikesExcluded:true,dishuiUnchanged:true}));
