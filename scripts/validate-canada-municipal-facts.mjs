import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {load} from './us-geography.mjs';
import {canadaTargets} from './canada-municipalities.mjs';
const root='dist/data/europe/canada/',top=canadaTargets(),facts=load(root+'municipalities/facts.json'),stats=load(root+'statistics.json'),cat=load(root+'catalogue.bin'),images=load('dist/data/flag-images.json'),reviews=[load('scripts/canada-municipal-flag-files.json'),load('scripts/canada-municipal-fotw-flag-files.json')],manifests=[load('dist/data/canada-municipal-flag-sources.json'),load('dist/data/canada-municipal-fotw-flag-sources.json')],flags=Object.assign({},...manifests.map(m=>m.flags));
assert.equal(Object.keys(facts.records).length,500);assert.equal(facts.cutoffPopulation,8692);assert.deepEqual(Object.keys(facts.records),top.map(r=>r.id));
for(const r of top){const f=facts.records[r.id],s=stats.regions['canada:'+r.id];assert.equal(f.rank,r.rank);assert.equal(f.population,r.population);assert.equal(s.population.value,r.population);assert.equal(s.population.coverageNote,r.id==='CA-CSD-3553005'?'2021 city boundary; excludes Wahnapitei 11':'2021 census boundaries');assert(!s.gdp&&!s.gdpPerCapita);}
for(let i=0;i<reviews.length;i++)assert.deepEqual(Object.keys(manifests[i].flags),Object.keys(reviews[i].flags),'Every reviewed flag is cached');
for(const[id,flag]of Object.entries(flags)){
 const r=cat.records.find(r=>r.id===id);assert(facts.records[id]);assert.equal(flag.identity.csduid,r.code);assert.equal(flag.identity.parent,r.parent);assert.equal(flag.identity.province,r.code.slice(0,2));
 const pin=reviews.find(m=>m.flags[id]).flags[id],original=fs.readFileSync('dist/'+flag.full);assert.equal(flag.source,pin.source);assert.equal(createHash('sha256').update(original).digest('hex'),flag.sha256);assert.equal(createHash('sha1').update(original).digest('hex'),flag.commonsSha1||flag.sourceSha1);
 assert(flag.credit&&flag.license&&flag.page&&flag.width>0&&flag.height>0);assert.equal(images[flag.file].full,flag.full);assert.equal(facts.records[id].flag.full,flag.full);
 const image=await sharp('dist/'+flag.file).metadata();assert.equal(image.format,'webp');assert.equal(image.height,180);assert(Math.abs(image.width/image.height-flag.width/flag.height)<.03);
}
assert.notEqual(flags['CA-CSD-5915001'].source,flags['CA-CSD-5915002'].source,'Langley township must not use the city flag');
for(const id of ['CA-CSD-1307019','CA-CSD-1206001','CA-CSD-1006017'])assert(!flags[id],'No city/parish/district mismatch or explicitly unofficial flag');
assert(!/RCM/i.test(flags['CA-CSD-2461025'].page));assert(!/RCM/i.test(flags['CA-CSD-2472010'].page));
console.log('Canada municipal facts: exact top-500 CSD ranking; '+Object.keys(flags).length+' hash-verified originals, faithful thumbnails and source attribution; Langley/city-region distinctions and unofficial exclusions passed.');
