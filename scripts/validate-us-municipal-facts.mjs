import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';
import {load,csv} from './us-geography.mjs';
import {rankMunicipalities} from './prepare-us-municipal-facts.mjs';
import {metricScale} from '../dist/region-colors.mjs';
const root='dist/data/europe/united-states/',cat=load(root+'catalogue.bin'),facts=load(root+'municipalities/facts.json'),stats=load(root+'statistics.json'),pins=load('scripts/us-municipal-fact-sources.json'),review=load('scripts/us-municipal-flag-files.json'),extraReview=load('scripts/us-municipal-fotw-flag-files.json'),manifest=load('dist/data/us-municipal-flag-sources.json'),extra=load('dist/data/us-municipal-fotw-flag-sources.json'),allFlags={...manifest.flags,...extra.flags},images=load('dist/data/flag-images.json');
const bytes=gunzipSync(fs.readFileSync(pins.population.retained));
assert.equal(createHash('sha256').update(bytes).digest('hex'),pins.population.sha256);
const ranking=rankMunicipalities(cat.records,csv(bytes.toString('utf8'))).slice(0,500);
assert.equal(Object.keys(facts.records).length,500);assert.equal(facts.eligibleGovernments,35648);assert.equal(facts.cutoffPopulation,84647);
assert.deepEqual(Object.keys(facts.records),ranking.map(r=>r.record.id),'Exact whole-government top 500');
assert.equal(Object.values(stats.regions).filter(r=>r.population?.source==='usMunicipalPopulation').length,500);
for(const[{record:r,value,summaryLevel},i]of ranking.map((r,i)=>[r,i])){
 const f=facts.records[r.id],s=stats.regions['united-states:'+r.id];
 assert.equal(f.rank,i+1);assert.equal(f.population,value);assert.equal(f.summaryLevel,summaryLevel);assert.equal(s.population.value,value);assert.equal(s.population.date,'2025-07-01');assert.equal(s.population.method,'estimate');assert.equal(s.area.value,r.areaKm2);assert(stats.sources[s.population.source].url===pins.population.url);
 assert(!s.gdp&&!s.gdpPerCapita,'A municipality never inherits state GDP');
}
assert.equal(facts.records['US-CONCITY-2148003'].population,795222,'Whole consolidated Louisville, not the statistical balance');
assert.equal(facts.records['US-MCD-3605934000'].population,795734,'Hempstead town, not the village');
assert(!facts.records['US-ZIP-90210']);assert(!facts.records['US-PLACE-0601290'],'CDPs excluded from municipal ranking');
assert.equal(Object.keys(manifest.flags).length,Object.keys(review.flags).length,'Every reviewed flag is fully cached');
assert.equal(Object.keys(extra.flags).length,Object.keys(extraReview.flags).length,'Every additional reviewed flag is cached');
for(const[id,flag]of Object.entries(allFlags)){
 assert(facts.records[id],'Only targeted municipal governments receive flags');
 const reviewedFlag=flag.repository==='fotw'?extraReview.flags[id]:review.flags[id];assert(reviewedFlag);assert.equal(flag.source,reviewedFlag.source);assert.equal(flag.commonsSha1||flag.sourceSha1,reviewedFlag.commonsSha1||reviewedFlag.sourceSha1);
 assert.equal(flag.identity.fips,cat.records.find(r=>r.id===id).code);assert.equal(flag.parent,cat.records.find(r=>r.id===id).parent);
 const original=fs.readFileSync('dist/'+flag.full);assert.equal(createHash('sha256').update(original).digest('hex'),flag.sha256);assert.equal(createHash('sha1').update(original).digest('hex'),flag.commonsSha1||flag.sourceSha1);
 assert(flag.credit&&flag.license&&flag.page&&flag.source&&flag.width>0&&flag.height>0);if(flag.repository!=='fotw')assert(!/unofficial|proposed|fictional|conceptual/i.test(flag.evidence.description+' '+flag.commonsFile));
 else assert(extraReview.audit.some(r=>r.id===id&&r.status==='added'),'Current flag section reviewed; surrounding historical/proposal discussion does not classify the selected image');
 assert.equal(images[flag.file].full,flag.full);assert.equal(facts.records[id].flag.full,flag.full);
 const info=await sharp('dist/'+flag.file).metadata();assert.equal(info.format,'webp');assert.equal(info.height,180);assert(Math.abs(info.width/info.height-flag.width/flag.height)<.025,'Thumbnail proportions remain faithful');
}
for(const id of ['US-PLACE-0602000','US-PLACE-0807850','US-MCD-1716711046'])assert(!allFlags[id],'Unverified variant, map or city logo omitted: '+id);
const colors=load('dist/data/region-colors/united-states.json'),scale=metricScale(colors,'population',3);
assert.equal(scale.count,500);assert.equal(scale.total,50130);assert.equal(colors.records.filter(r=>r.level===3).length,500,'Sparse metric data avoids copying all municipal records');
assert.equal(metricScale(colors,'gdp',3),null);
console.log('US municipal facts: 500 exact Census 2025 populations; '+Object.keys(allFlags).length+' identity-matched flag originals/thumbnails; whole-government scope, own area, no GDP inheritance, source hashes and sparse metric coverage passed.');
