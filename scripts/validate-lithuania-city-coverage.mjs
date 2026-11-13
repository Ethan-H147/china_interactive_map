import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load,polygons,landIndex} from './geo-index.mjs';
import {lithuanianCityAreas} from './lithuania-city-coverage.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import '../dist/countries.js';
const dir='dist/data/europe/lithuania/',cat=load(dir+'catalogue.bin'),records=new Map(cat.records.map(r=>[r.id,r]));
const probes={'29':[23.316,55.934],'12':[24.031,54.603],'15':[23.987,54.018],'57':[24.979,55.842],'62':[25.416,55.226]};
const contains=(g,p)=>landIndex(polygons(g).flat())(p);
for(const city of lithuanianCityAreas){
 const r=records.get('LT-CITY-'+city.code),m=records.get(r.parent),county=records.get(m.parent),p=probes[city.code];
 assert.equal(r.level,3);assert.equal(m.level,2);assert(!r.statusNote&&!r.note,'No explanatory city description');
 assert.notEqual(r.kind,'Eldership');const stat=load(dir+'statistics.json').regions['lithuania:'+r.id];assert(!stat.note,'No explanatory statistics description');if(city.partial)assert(!stat.population,'No whole-city population assigned to a partial area');else assert.equal(stat.population?.value,({12:2966,15:12754,57:5853,62:5459})[city.code],'Official city population');
 for(const [file,id]of [[cat.chunks[m.id].file,r.id],[cat.chunks[county.id].file,m.id],['first.bin',county.id]]){
  const f=load(dir+file).regions.features.find(f=>f.properties.id===id);assert(f&&contains(f.geometry,p),'City centre is land at every level: '+id);
 }
 const thirds=load(dir+cat.chunks[m.id].file).regions;
 const union=await command(thirds,'-dissolve');
 const sum=thirds.features.reduce((a,f)=>a+geographicAreaKm2(f.geometry),0),unionArea=union.features.reduce((a,f)=>a+geographicAreaKm2(f.geometry),0);
 assert(Math.abs(sum-unionArea)<.0001,'City area does not overlap an eldership');
 for(const file of ['europe/lithuania/context.bin','world-land.bin','globe-overview-land.bin']){
  const f=load('dist/data/'+file).features.find(f=>f.properties.country==='lithuania');assert(contains(f.geometry,p),'Background city coverage '+file+' '+city.name);
 }
}
assert.equal(records.get('LT-M-29').kind,'City municipality');assert.equal(records.get('LT-M-29').parent,'LT-C-6');assert.equal(records.get('LT-CITY-57').parent,'LT-M-57');
for(const c of ['estonia','lithuania'])assert(!globalThis.AtlasCountries.countries[c].map.capitalPoints,'No city dots '+c);
const before='artifacts/lithuania-city-coverage/before/'+dir+'statistics.json';
if(fs.existsSync(before)){const old=load(before),now=load(dir+'statistics.json');for(const [id,s]of Object.entries(old.regions)){assert.deepEqual(now.regions[id],s,'Existing statistics unchanged '+id);}}
console.log('Five city areas: correct parents and status, solid fills at all levels, no overlap, unchanged existing statistics, and no Baltic city dots.');
