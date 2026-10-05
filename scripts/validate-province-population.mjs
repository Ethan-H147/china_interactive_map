import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readData} from './read-data.mjs';
import {readPopulationSources,prepareProvincePopulation,mongoliaCodes,normalizeMongoliaName} from './prepare-province-population.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../dist/data/province-population.json',import.meta.url),'utf8'));
const provinces=readData('display-boundaries.json').provinces.features;
assert.deepEqual(data,prepareProvincePopulation(readPopulationSources(),provinces),'Output must reproduce from retained source snapshots');
assert.deepEqual(data.coverage,{china:34,mongoliaProvinces:21,mongoliaMunicipalities:1});
assert.equal(Object.keys(data.china).length,34);
assert.equal(Object.keys(data.mongolia).length,22);
assert.equal(Object.values(data.china).filter(r=>r.sourceId==='china').reduce((sum,r)=>sum+r.total,0),1409778724,'31 provincial census totals exclude the separately listed 2 million servicemen');
assert.equal(data.china[110000].total,21893095);
assert.equal(data.china[440000].total,126012510);
assert.equal(data.china[810000].total,7413070);
assert.equal(data.china[820000].total,682070);
assert.equal(data.china[710000].total,23829897);
assert.equal(data.china[710000].date,'2020-11-08');
assert.equal(data.china[810000].date,'2021-06-30');
assert.equal(data.china[820000].date,'2021-08');
assert.equal(data.mongolia['MN-1'].total,1539810);
assert.equal(data.mongolia['MN-073'].total,94994);
assert.equal(data.mongolia['MN-064'].total,17928);
assert.equal(data.sources.mongolia.revision,1377642373);
for(const [id,record] of [...Object.entries(data.china),...Object.entries(data.mongolia)]){
  assert(Number.isSafeInteger(record.total)&&record.total>0,'Positive entire-region population: '+id);
  assert(record.name&&record.date&&record.dateLabel&&record.measure&&record.sourceLabel);
  assert.match(record.sourceUrl,/^https:\/\//);
  assert(data.sources[record.sourceId]);
  assert(!record.towns&&!record.urbanCore,'Province records must not invent city/town or urban-core measures');
}
for(const [name,iso] of Object.entries(mongoliaCodes)){
  const record=data.mongolia[iso];
  assert.equal(record.name,name);
  assert.equal(record.date,'2020');
  assert.match(record.nameMn,/[\u0400-\u04ff]/u);
  assert.match(record.traditional,/^[\u1800-\u18af\s]+$/u);
  assert.equal(data.mongoliaAliases[normalizeMongoliaName(name)],iso);
}
for(const iso of Object.values(data.mongoliaAliases))assert(data.mongolia[iso]);
assert(!data.china[440100],'No province total may be attached to a city');
console.log(JSON.stringify({provincePopulationCoverage:data.coverage,sourceSnapshotsVerified:6,geographicMeasuresAndDatesVerified:true,traditionalNamesVerified:22}));
