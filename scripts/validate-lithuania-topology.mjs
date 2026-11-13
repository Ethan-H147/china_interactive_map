import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load,polygons,linesOf,lineIndex,landIndex,metres} from './geo-index.mjs';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
const dir='dist/data/europe/lithuania/',cat=load(dir+'catalogue.bin');
const second=load(dir+'second/LT-C-6.bin'),city=second.regions.features.find(f=>f.properties.id==='LT-M-29'),near=lineIndex(linesOf(second.boundaries));
let checked=0,length=0;
for(const poly of polygons(city.geometry))for(const ring of poly)for(let i=1;i<ring.length;i++){
 const a=ring[i-1],b=ring[i],size=metres(a,b);if(size<1)continue;
 for(const t of [.25,.5,.75])assert(near([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])<1,'Continuous Šiauliai city outline '+JSON.stringify([a,b]));
 checked++;length+=size;
}
const source=load('scripts/boundary-sources/baltics/lt-level3.json.gz'),wards=load('scripts/boundary-sources/baltics/lt-level4.json.gz');
const gaps=await command({'m.json':fc(source.features.filter(f=>f.properties.nationalcode==='94')),'w.json':fc(wards.features.filter(f=>f.properties.upperlevelunit_href==='#municipality_94'))},'-erase w.json -explode');
const gap=gaps.features.find(f=>f.geometry&&geographicAreaKm2(f.geometry)>.1),inside=landIndex(polygons(gap.geometry).flat()),[[w,s],[e,n]]=geographicBounds(gap.geometry);
const first=load(dir+'first.bin'),municipal=load(dir+'second/LT-C-7.bin'),third=load(dir+'third/LT-M-94.bin');
const indexes=[first,municipal,third].map(d=>d.regions.features.map(f=>({id:f.properties.id,inside:landIndex(polygons(f.geometry).flat())})));
let probes=0;
for(let x=0;x<45;x++)for(let y=0;y<45;y++){
 const p=[w+(e-w)*(x+.5)/45,s+(n-s)*(y+.5)/45];if(!inside(p))continue;
 const hits=indexes.map(list=>list.filter(f=>f.inside(p)));
 assert.equal(hits[0].length,1);assert.equal(hits[0][0].id,'LT-C-7');assert.equal(hits[1].length,1);assert.equal(hits[1][0].id,'LT-M-94');assert.equal(hits[2].length,1);assert(['LT-W-9497','LT-W-9494'].includes(hits[2][0].id));probes++;
}
assert(probes>30,'River slit was sampled densely');
const oldFile='artifacts/lithuania-city-coverage/before-population/'+dir+'statistics.json',stats=load(dir+'statistics.json');
if(fs.existsSync(oldFile))for(const [id,data]of Object.entries(load(oldFile).regions))if(!id.includes('LT-CITY-'))assert.deepEqual(stats.regions[id],data,'Existing statistics unchanged '+id);
assert.equal(cat.counts[3],538);
console.log('Continuous Šiauliai outline:',checked,'segments,',Math.round(length/1000),'km; filled Jurbarkas slit:',probes,'ownership probes; IDs and existing statistics preserved.');
