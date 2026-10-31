import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {majorCityFlags} from '../dist/major-city-flags.mjs';
import {load} from './geo-index.mjs';
import {canadaTargets} from './canada-municipalities.mjs';
const review=load('scripts/boundary-sources/major-city-flags/reviewed.json'),manifest=load('dist/data/major-city-flag-sources.json'),images=load('dist/data/flag-images.json'),facts=load('dist/data/europe/canada/municipalities/facts.json');
const catalogues={canada:load('dist/data/europe/canada/catalogue.bin').records,brazil:load('dist/data/south-america/brazil-local/index.bin').records};
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(review.records.length,56);assert.deepEqual(Object.keys(manifest.flags).sort(),review.records.map(r=>r.id).sort());
for(const r of review.records){
 const f=manifest.flags[r.id],unit=catalogues[r.country].find(x=>x.id===r.id),ui=majorCityFlags[r.country].detailFlags[r.id];
 assert.equal(unit.en,r.name);assert.equal(unit.parent,r.parent);assert.equal(unit.level,r.level);assert(r.evidence&&r.adoption,'Adoption evidence required '+r.name);
 assert.equal(f.sha256,r.expectedSourceSha256);assert.equal(ui.file,f.file);assert.equal(ui.full,f.full);assert.equal(hash(fs.readFileSync('dist/'+f.full)),f.sha256,'Retained source hash '+r.name);assert.equal(hash(fs.readFileSync('dist/'+f.file)),f.thumbnailSha256);
 assert.equal(images[f.file].full,f.full);assert(f.credit&&f.license&&f.page);const size=await sharp('dist/'+f.file).metadata();if(f.reuse)assert(size.height>=180);else assert.equal(size.height,180);assert(Math.abs(size.width/size.height-f.width/f.height)<.035,'Flag proportions '+r.name);
}
const ibge=load('scripts/boundary-sources/major-city-flags/ibge-2025.json.gz').rows.slice(1).sort((a,b)=>Number(b.V)-Number(a.V));
for(const r of ibge.slice(0,50))assert(majorCityFlags.brazil.detailFlags['BR-'+r.D1C],'Top 50 municipality missing '+r.D1N);
for(const code of ['1100205','1200401','1302603','1400100','1501402','1600303','1721000','2111300','2211001','2304400','2408102','2507507','2611606','2704302','2800308','2927408','3106200','3205309','3304557','3550308','4106902','4205407','4314902','5002704','5103403','5208707','5300108'])assert(majorCityFlags.brazil.detailFlags['BR-'+code],'Brazil capital missing '+code);
const capitals=['1001519','1102075','1209034','1310032','2423027','3520005','3506008','4611040','4706027','4811061','5917034','6001009','6106023','6204003'].map(code=>'CA-CSD-'+code),caScope=new Set([...canadaTargets().slice(0,50).map(r=>r.id),...capitals]);
for(const id of caScope)assert(facts.records[id]?.flag||majorCityFlags.canada.detailFlags[id],'Canadian major city missing '+id);
assert.equal(caScope.size,56);assert.equal(Object.keys(majorCityFlags.canada.detailFlags).length,3);assert.equal(Object.keys(majorCityFlags.brazil.detailFlags).length,53);
assert.equal(majorCityFlags.brazil.detailFlags['BR-5300108'].file,'vendor/brazil-flags/BR-53.webp');
console.log('Official major-city flags: 56 Canadian cities covered (3 additions); 53 Brazilian city selections; all capitals, identity matches, source hashes, proportions and shared viewer originals verified.');
