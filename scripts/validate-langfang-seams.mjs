import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readData} from './read-data.mjs';
import {load,polygons,lineIndex,landIndex,metres} from './geo-index.mjs';
import {fc,command} from './build-regional-dataset.mjs';
import {geographicAreaKm2 as area} from './geographic-area.mjs';
import {decodePack} from '../dist/china-pack.mjs';
import {chinaSourceBuilders} from '../dist/china-sources.mjs';
const d=readData('display-boundaries.json'),report=load('dist/data/langfang-seams.json'),before=load('scripts/boundary-sources/langfang/before.bin'),meta=load('scripts/boundary-sources/langfang/manifest.json');
assert.equal(createHash('sha256').update(fs.readFileSync('scripts/boundary-sources/langfang/before.bin')).digest('hex'),meta.sha256);
assert.equal(report.arcs.length,6);
const province=new Map(d.provinces.features.map(f=>[f.properties.adcode,f])),district=new Map(d.subdivisions.features.map(f=>[f.properties.adcode,f]));
const pack=decodePack(gunzipSync(fs.readFileSync('dist/data/china-boundaries.pack.bin'))),builders=chinaSourceBuilders(pack),drawn=lineIndex(builders['province-boundaries']().features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates));
let probes=0,sides=0;
for(const r of report.arcs){
 const a=r.reference===131000?district.get(131000):province.get(r.reference),b=province.get(r.alignedProvince),edgeA=lineIndex(polygons(a.geometry).flat()),edgeB=lineIndex(polygons(b.geometry).flat()),insideA=landIndex(polygons(a.geometry).flat()),insideB=landIndex(polygons(b.geometry).flat());
 for(let i=1;i<r.canonical.length;i++){
  const a=r.canonical[i-1],b=r.canonical[i];
  for(const t of [.1,.5,.9]){const p=a.map((v,j)=>v+(b[j]-v)*t);assert(edgeA(p)<.25,'Reference shared arc retained');assert(edgeB(p)<.25,'Neighbor fill follows the same shared arc');assert(drawn(p)<.6,'Shared edge has a visible border stroke');probes++;}
  if(metres(a,b)<30)continue;
  const mid=a.map((v,j)=>(v+b[j])/2),c=Math.cos(mid[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],n=Math.hypot(dx,dy);
  for(const side of [-1,1]){const p=[mid[0]-dy/n*side*.00003/c,mid[1]+dx/n*side*.00003];assert.notEqual(insideA(p),insideB(p),'Exactly one owner on each side of a shared border');sides++;}
 }
}
const relevant=d.subdivisions.features.filter(f=>[110000,120000,130000].includes(f.properties.provinceCode)),union=await command(fc(relevant),'-dissolve2',{precision:null});
const localHoles=union.features.flatMap(f=>polygons(f.geometry).flatMap(p=>p.slice(1))).filter(r=>r.some(p=>p[0]>116.4&&p[0]<117.38&&p[1]>39.5&&p[1]<40.25));
assert.equal(localHoles.length,0,'No holes around Langfang’s exclave or the connecting Beijing–Tianjin border');
const sum=fs=>fs.reduce((n,f)=>n+area(f.geometry),0);
assert(Math.abs(sum(relevant)-sum(union.features))<.005,'No overlapping fills');
for(const code of [110000,120000,130000])assert(Math.abs(sum(relevant.filter(f=>f.properties.provinceCode===code))-area(province.get(code).geometry))<.005,'Province fill equals its subdivisions');
const changed=[];
for(const f of before.subdivisions.features){const now=district.get(f.properties.adcode);if(JSON.stringify(now.geometry)!==JSON.stringify(f.geometry))changed.push(f.properties.adcode);}
assert.deepEqual(changed.sort(),[110112,110115,110117,120114,120115,120118,120119]);
assert.deepEqual(district.get(131000).geometry,before.subdivisions.features.find(f=>f.properties.adcode===131000).geometry,'Langfang reference and all exclave components preserved');
const counties=load('dist/data/china-counties.bin').regions.features.filter(f=>f.properties.parentCity===131000),countyUnion=await command(fc(counties),'-dissolve2',{precision:null}),parent=district.get(131000),missing=await command({'parent.json':fc([parent]),'counties.json':countyUnion},'-erase counties.json',{precision:null}),outside=await command({'counties.json':countyUnion,'parent.json':fc([parent])},'-erase parent.json',{precision:null});
assert(sum(missing.features)+sum(outside.features)<.1,'Langfang county layers continue to tile their unchanged parent');
console.log(JSON.stringify({langfangSeamsVerified:true,sharedArcSamples:probes,twoSidedOwnershipProbes:sides,localHoles:localHoles.length,changedDistricts:changed,countyCoverageVerified:true}));
