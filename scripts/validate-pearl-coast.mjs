import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
import {polygons} from './international-topology.mjs';
import {coastCities,collection,area,run} from './pearl-coast.mjs';
import {segmentDistanceIndex} from './shenzhen-hongkong.mjs';
const baseline='78ec48760a94ba9e52f96d215549340a230454e9';
const show=name=>{const r=spawnSync('git',['-c','safe.directory='+process.cwd().replaceAll('\\','/'),'show',baseline+':dist/data/'+name],{maxBuffer:50e6});assert.equal(r.status,0);return r.stdout;};
const m=JSON.parse(show('display-boundaries.parts.json')),before=JSON.parse(gunzipSync(Buffer.concat(m.parts.map(show))));
const preview=process.argv.includes('--preview')?JSON.parse(fs.readFileSync('artifacts/pearl-coast-preview.json')):null;
const after=preview?.data||readData('display-boundaries.json'),districts=preview?.districts||JSON.parse(gunzipSync(fs.readFileSync('dist/data/city-districts.bin'))),report=preview?.report||readData('pearl-coast-report.json'),oldDistricts=JSON.parse(gunzipSync(show('city-districts.bin')));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
let unrelated=0;
for(const f of before.subdivisions.features){const n=after.subdivisions.features.find(g=>g.properties.adcode===f.properties.adcode);assert.deepEqual(n.properties,f.properties);if(!coastCities.has(f.properties.adcode)){assert.equal(hash(n),hash(f),'Unrelated city changed '+f.properties.adcode);unrelated++;}}
for(const f of before.provinces.features)if(f.properties.adcode!==440000)assert.equal(hash(after.provinces.features.find(g=>g.properties.adcode===f.properties.adcode)),hash(f),'Unrelated province changed');
for(const f of oldDistricts.regions.features){const n=districts.regions.features.find(g=>g.properties.adcode===f.properties.adcode);assert.deepEqual(n.properties,f.properties);if(f.properties.parentCity!==440100)assert.equal(hash(n),hash(f),'Unrelated district changed');}
for(const file of ['major-water.bin','sar-810000.json','sar-820000.json','shenzhen-hongkong-border.json'])assert.deepEqual(fs.readFileSync('dist/data/'+file),show(file),'Protected dataset changed '+file);
const inRing=([x,y],r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const contains=(f,p)=>polygons(f.geometry).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
const owners=p=>after.subdivisions.features.filter(f=>contains(f,p)).map(f=>f.properties.adcode);
const checkpoints=[['Guishan',113+49.4/60,22+8.1/60,440400],['Wailingding',114+2.2/60,22+6.1/60,440400],['Dangan',114+16.1/60,22+2.6/60,440400],['Dongao',113+42.4/60,22+1.3/60,440400],['Dawanshan',113+43.7/60,21+56.5/60,440400],['Dajia',114+39/60,22+34.6/60,441300],['Xiaojia',114+37.8/60,22+36.9/60,441300],['Longxue',113.603,22.637,440100]];
for(const [name,x,y,code] of checkpoints)assert.deepEqual(owners([x,y]),[code],'Island ownership '+name);
for(const p of [[113.78,21.85],[114.10,21.90],[115.0,22.4],[113.8,22.4]])assert.deepEqual(owners(p),[],'Open sea should remain empty '+p);
const raw=gunzipSync(fs.readFileSync('dist/data/pearl-coast-source.bin')),source=readData('pearl-coast-source.json'),osm=JSON.parse(raw),land=JSON.parse(gunzipSync(fs.readFileSync('dist/data/pearl-coast-land.bin')));
assert.equal(createHash('sha256').update(raw).digest('hex'),source.sha256);
const key=p=>p.map(n=>n.toFixed(8)).join(','),sourceVertices=new Set(osm.elements.flatMap(w=>w.geometry.map(p=>key([p.lon,p.lat]))));
for(const entry of report.supplementalMatches){
  assert.deepEqual(owners(entry.point),[entry.adcode],'Supplemental island ownership '+entry.name);
  const way=osm.elements.find(w=>w.id===entry.osmWay);assert.equal(way.tags.name,entry.name);
  const city=after.subdivisions.features.find(f=>f.properties.adcode===entry.adcode),keys=new Set(polygons(city.geometry).flat(2).map(key));
  for(const p of way.geometry)assert(keys.has(key([p.lon,p.lat])),'Supplemental coastline source vertex missing');
}
const total=fc=>fc.features.reduce((n,f)=>n+(f.geometry?area(f.geometry):0),0);
const counts=[];
const oldTop=topology({regions:structuredClone(before.subdivisions)});
let sharedSamples=0;
for(const code of coastCities){
 const city=after.subdivisions.features.find(f=>f.properties.adcode===code),stats=report.cities.find(c=>c.adcode===code);
 const vertices=polygons(city.geometry).flat(2),retained=vertices.filter(p=>sourceVertices.has(key(p))).length;
 assert(retained>({440100:1000,440400:20000,441300:10000}[code]),'Insufficient source coastline coverage '+code);
 for(const p of polygons(city.geometry))for(const r of p){assert.deepEqual(r[0],r.at(-1));assert(r.length>=4);assert(r.every(p=>p.every(Number.isFinite)));}
 const neighbors=collection(after.subdivisions.features.filter(f=>f.properties.adcode!==code&&(f.properties.provinceCode===440000||[810000,820000].includes(f.properties.provinceCode))));
 const overlap=total(await run('-i city.json -clip neighbors.json',{'city.json':city,'neighbors.json':neighbors}));
 const oldCity=before.subdivisions.features.find(f=>f.properties.adcode===code),oldNeighbors=collection(before.subdivisions.features.filter(f=>f.properties.adcode!==code&&(f.properties.provinceCode===440000||[810000,820000].includes(f.properties.provinceCode))));
 const priorOverlap=total(await run('-i city.json -clip neighbors.json',{'city.json':oldCity,'neighbors.json':oldNeighbors}));
 assert(overlap<=priorOverlap+1e-10,'New city overlap '+code+' '+overlap+' baseline '+priorOverlap);
 const clean=await run('-i city.json -clean gap-width=0',{'city.json':city});assert(Math.abs(total(clean)-area(city.geometry))<1e-10,'Invalid city coverage '+code);
 const shared=mesh(oldTop,oldTop.objects.regions,(a,b)=>a!==b&&(a.properties.adcode===code||b.properties.adcode===code));
 const distance=segmentDistanceIndex(polygons(city.geometry).flat());
 for(const line of shared.coordinates)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],p=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  if(land.features.some(f=>contains(f,p))){assert(distance(p)<.02,'Shared inland border moved '+code+' '+p);sharedSamples++;}
 }
 // Every unambiguous offshore island retains its original detailed boundary.
 // The reviewed Macau window is checked separately by validate-alignment.
 const actualVertices=new Set(vertices.map(key));
 let wholeVertices=0;
 for(const id of stats.wholeIslandIds)for(const p of polygons(land.features[id].geometry).flat(2)){
  if(p[0]>=113.48&&p[0]<=113.61&&p[1]>=22.08&&p[1]<=22.26)continue;
  assert(actualVertices.has(key(p)),'Full island shoreline vertex lost '+code+' island '+id+' '+p);wholeVertices++;
 }
 counts.push({code,vertices:vertices.length,sourceVertices:retained,wholeIslandVertices:wholeVertices,parts:polygons(city.geometry).length});
}
const children=collection(districts.regions.features.filter(f=>f.properties.parentCity===440100)),gz=after.subdivisions.features.find(f=>f.properties.adcode===440100);
assert.equal(children.features.length,11);
assert(total(await run('-i children.json -erase city.json',{'children.json':children,'city.json':gz}))<1e-10,'Guangzhou district outside city');
assert(Math.abs(total(children)-total(await run('-i children.json -dissolve',{'children.json':children})))<1e-10,'Guangzhou district overlap');
const missing=total(await run('-i city.json -erase children.json',{'city.json':gz,'children.json':children}));assert(missing/area(gz.geometry)<.005,'Guangzhou district coverage');
console.log(JSON.stringify({unrelatedRegionsUnchanged:unrelated,unrelatedDistrictsUnchanged:43,sharedInlandBorderSamples:sharedSamples,namedIslandCheckpoints:checkpoints.length,cities:counts}));
