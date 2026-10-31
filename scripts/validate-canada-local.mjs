import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {load,polygons,linesOf,metres,landIndex} from './geo-index.mjs';
import {canadaPopulation,canadaTargets,isMunicipalGovernment} from './canada-municipalities.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
const root='dist/data/europe/canada/',cat=load(root+'catalogue.bin'),stats=load(root+'statistics.json'),pop=canadaPopulation(),index=new Map(cat.records.map(r=>[r.id,r]));
assert.deepEqual(cat.counts,{1:13,2:293,3:5161});assert.equal(index.size,cat.records.length);
for(const source of Object.values(load('scripts/canada-statistics-sources.json').files)){const bytes=gunzipSync(fs.readFileSync(source.retained));assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);}
let published=0,unavailable=0;
for(const r of cat.records){
 assert(r.en&&r.kind&&r.areaKm2>0&&r.center.every(Number.isFinite)&&r.bounds.flat().every(Number.isFinite));
 const s=stats.regions['canada:'+r.id];assert(s.area.value>0);
 if(r.level>1){assert.equal(index.get(r.parent).level,r.level-1);assert(!s.gdp&&!s.gdpPerCapita,'No inherited provincial GDP');}
 if(r.level===3){
  assert.equal(r.parent,'CA-CD-'+r.code.slice(0,4));assert.equal(index.get(r.parent).parent,r.province);
  const p=pop.get(r.code);assert(p);if(p.value===null){assert(!s.population&&s.note);unavailable++;}else{assert.equal(s.population.value,p.value);assert.equal(s.population.date,'2025-07-01');published++;}
 }
}
assert.equal(published,5155);assert.equal(unavailable,6);
assert.equal(index.get('CA-CSD-3520005').parent,'CA-CD-3520','Toronto must not inherit the mirror’s erroneous Durham column');
assert.equal(index.get('CA-CSD-3532038').parent,'CA-CD-3532','East Zorra-Tavistock belongs to Oxford, not Waterloo');
assert.equal(index.get('CA-CSD-2466023').province,'CA-QB','Existing Quebec route remains usable');
const chunkNames=new Set();
for(const[parent,c]of Object.entries(cat.chunks)){
 assert(!chunkNames.has(c.file));chunkNames.add(c.file);const bytes=fs.readFileSync(root+c.file),d=load(root+c.file);assert.equal(c.bytes,bytes.length);assert.equal(d.regions.features.length,c.count);assert(c.decodedBytes<=12*1024*1024,'Bounded detailed geometry '+parent);
 for(const f of d.regions.features){assert.equal(index.get(f.properties.id).parent,parent);assert(polygons(f.geometry).length);assert(landIndex(polygons(f.geometry).flat())(index.get(f.properties.id).center),'Label stays on own land '+f.properties.id);for(const p of polygons(f.geometry))for(const ring of p){assert(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));assert(ring.every(p=>p.every(Number.isFinite)));}}
 for(const f of d.boundaries.features){assert(f.properties.owners.length>=2,'No coast stroke in shared borders');for(const id of f.properties.owners)assert.equal(index.get(id).parent,parent,'Shared borders never duplicate a higher-level boundary');}
}
const oleary=load(root+'third/CA-CD-1103.bin').regions.features,fireDistrict=oleary.find(f=>f.properties.id==='CA-CSD-1103065');assert(!landIndex(polygons(fireDistrict.geometry).flat())(index.get('CA-CSD-1103042').center),'Surrounding fire district must not fill the enclaved Town of O\'Leary');
assert.equal(chunkNames.size,306);assert(fs.statSync(root+'first.bin').size<4.1*1024*1024,'National geometry budget');assert(!fs.existsSync(root+'all.bin'),'No nationwide detail bundle');
const first=load(root+'first.bin'),lengths=new Map();for(const f of first.boundaries.features){const pair=f.properties.owners.slice().sort().join('|'),n=linesOf({features:[f]}).reduce((sum,line)=>sum+line.slice(1).reduce((v,p,i)=>v+metres(p,line[i]),0),0);lengths.set(pair,(lengths.get(pair)||0)+n);}assert(lengths.get('CA-AB|CA-SK')>1150000,'Alberta/Saskatchewan land border, excluding Lake Athabasca');assert(lengths.get('CA-MB|CA-SK')>1200000,'Entire Manitoba/Saskatchewan shared land border');assert(lengths.get('CA-NL|CA-QB')>1000000,'Labrador/Quebec curved border must remain continuous');
const search=createPlaceSearch(cat.records);for(const[q,id]of [['Toronto ON','CA-CSD-3520005'],['Quebec City','CA-CSD-2423027'],['Langley District municipality','CA-CSD-5915001'],['Langley City','CA-CSD-5915002']])assert(search(q).some(r=>r.id===id),q);
assert(!canadaTargets().some(r=>r.code==='1307019'),'A statistical parish is not the City of Moncton');
console.log('Canada local: 13 provinces/territories, 293 divisions, 5,161 local units; 5,155 exact 2025 estimates; six unavailable values; code-derived hierarchy, legal types, geometry budgets, shared-only borders, search and no GDP inheritance passed.');
