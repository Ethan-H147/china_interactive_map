import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {applySharedPlacePages,sharedPlacePage,sharedPlaceGeometry,uniquePlacePages} from '../dist/shared-place-pages.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
const base='dist/data/europe/united-states/',cat=JSON.parse(gunzipSync(fs.readFileSync(base+'catalogue.bin'))),defs=JSON.parse(fs.readFileSync(base+'shared-place-pages.json')),stats=JSON.parse(fs.readFileSync(base+'statistics.json')),facts=JSON.parse(fs.readFileSync(base+'municipalities/facts.json'));
const original=structuredClone(cat.records),records=cat.records,index=new Map(records.map(r=>[r.id,r]));
assert.equal(defs.pages.length,66);assert.equal(defs.pages.filter(p=>p.type==='independent-city').length,41);assert.equal(defs.pages.filter(p=>p.parent==='US-VA').length,38);
for(const r of records)if(facts.records[r.id]?.flag)r.flag=facts.records[r.id].flag;
applySharedPlacePages(records,defs);const searchRecords=uniquePlacePages(records),search=createPlaceSearch(searchRecords);
assert.equal(searchRecords.length,records.length-66);
for(const page of defs.pages){
 const county=index.get(page.id),city=index.get(page.municipality);
 assert.equal(sharedPlacePage(city,index),county);assert.equal(sharedPlacePage(county,index),county);
 assert.equal(sharedPlaceGeometry(county,2,index),county);assert.equal(sharedPlaceGeometry(county,3,index),city);assert.equal(sharedPlaceGeometry(city,2,index),county);
 assert.equal(county.en,city.en);if(page.type==='independent-city')assert.equal(page.kind,'Independent city');assert.equal(county.kind,page.kind);assert.equal(city.kind,page.kind);
 assert.equal(county.areaKm2,city.areaKm2);assert.equal(county.parent,city.parent);
 assert.equal(search(page.id.replace('US-COUNTY-','')).filter(r=>r.sharedPageId===page.id).length,1);
 assert.equal(search(city.code).filter(r=>r.sharedPageId===page.id).length,1);
 assert(stats.regions['united-states:'+county.id]?.population,'Small independent cities retain county-equivalent population');
 if(city.flag)assert.deepEqual(county.flag,city.flag);
}
for(const before of original){const after=index.get(before.id);for(const field of ['id','code','level','parent','center','bounds','areaKm2'])assert.deepEqual(after[field],before[field],before.id+' preserves '+field);}
for(const id of ['US-COUNTY-29189','US-COUNTY-51059','US-COUNTY-51013','US-PLACE-1235000','US-COUNTY-12031','US-CONCITY-1836000','US-CONCITY-2028410','US-COUNTY-55078'])assert(!index.get(id).sharedPageId,'Separate geography retained: '+id);
assert.equal(index.get('US-COUNTY-29189').shortMapLabel,'St. Louis County');
assert.equal(index.get('US-COUNTY-24005').shortMapLabel,'Baltimore County');
assert.equal(index.get('US-COUNTY-51059').shortMapLabel,'Fairfax County');
assert.equal(index.get('US-COUNTY-06037').shortMapLabel,'Los Angeles');
assert.equal(index.get('US-COUNTY-06037').en,'Los Angeles County');
assert.equal(index.get('US-COUNTY-22033').shortMapLabel,'East Baton Rouge');
assert.equal(index.get('US-COUNTY-02090').shortMapLabel,'Fairbanks North Star');
assert.equal(index.get('US-COUNTY-02180').shortMapLabel,'Nome');
const before=records.map(r=>JSON.stringify(r));applySharedPlacePages(records,defs);for(let i=0;i<records.length;i++)assert.equal(JSON.stringify(records[i]),before[i],'Re-entering the country is stable: '+records[i].id);
console.log('66 shared US pages: canonical identities, one search result, both geometry IDs, all populations, flag inheritance, repeated loading and separate neighboring counties verified.');
