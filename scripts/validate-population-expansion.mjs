import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';
import '../dist/countries.js';import {populationExpansion,applyPopulationExpansion} from './population-expansion.mjs';
const base='scripts/statistics-sources/population-expansion/',read=f=>{let bytes=fs.existsSync(base+f)?fs.readFileSync(base+f):gunzipSync(fs.readFileSync(base+f+'.gz'));return JSON.parse(bytes);},snapshot=populationExpansion(),expected={brazil:5571,montenegro:25,mauritius:12,ghana:276,malaysia:156,israel:20,malta:68,indonesia:514};
for(const [name,record]of Object.entries(read('manifest.json'))){const bytes=fs.readFileSync(base+record.retained),decoded=record.retained.endsWith('.gz')?gunzipSync(bytes):bytes;assert.equal(decoded.length,record.bytes,name);assert.equal(createHash('sha256').update(decoded).digest('hex'),record.sha256,name);}
const before=fs.readFileSync(base+'normalized.json','utf8');execFileSync(process.execPath,['scripts/match-population-expansion.mjs']);assert.equal(fs.readFileSync(base+'normalized.json','utf8'),before,'Deterministic exact crosswalk');
const all={};
for(const [country,count]of Object.entries(expected)){
 const rows=snapshot.countries[country],file='dist/'+globalThis.AtlasCountries.countries[country].statistics,data=JSON.parse(fs.readFileSync(file));all[country]=data;
 assert.equal(rows.length,count);assert.equal(new Set(rows.map(r=>r.id)).size,count);
 const original=JSON.stringify(data);assert.equal(applyPopulationExpansion(country,data),count);assert.equal(JSON.stringify(data),original,'Idempotent population overlay '+country);
 for(const row of rows){const actual=data.regions[country+':'+row.id];assert.deepEqual(actual.population,row.population);assert.equal(actual.name,row.en);assert(Number.isInteger(actual.population.value)&&actual.population.value>=0);assert(data.sources[actual.population.source]?.url.startsWith('https://'));assert(!actual.gdp||row.level===1);}
 const colors=JSON.parse(fs.readFileSync('dist/data/region-colors/'+country+'.json'));
 for(const row of rows){const metric=colors.records.find(r=>r.id===row.id)?.metrics;assert.equal(metric?.population?.value,row.population.value);if(row.population.areaComparable===false)assert(!metric.populationDensity);}
}
const sum=(country,filter=()=>true)=>snapshot.countries[country].filter(filter).reduce((s,r)=>s+r.population.value,0);
assert.equal(sum('indonesia'),270203917);assert.equal(sum('ghana',r=>r.level===2),30832019);assert.equal(sum('malta'),519562);assert.equal(sum('montenegro'),623633);assert.equal(sum('mauritius',r=>!['MU-AG','MU-CC'].includes(r.id)),1233097);
assert.equal(all.malta.regions['malta:MT-37'].population.value,4548,'Nadur corrected against NSO');
assert.equal(all.brazil.regions['brazil:BR-5101837'].population.year,2025);assert.equal(all.brazil.regions['brazil:BR-5106240'].population.year,2025);assert.equal(all.brazil.regions['brazil:BR-5107925'].population.year,2025);
assert.equal(all.israel.regions['israel:IL-Z'].population.value,1519700-54900);assert.equal(all.israel.regions['israel:IL-JM'].population.areaComparable,false);
for(const r of snapshot.countries.malaysia)assert.equal(r.population.value%100,0);
// Density must not be derived for a census district whose territory differs.
assert(fs.readFileSync('dist/statistics.mjs','utf8').includes('record.population.areaComparable!==false'));
fs.unlinkSync(base+'matching-gaps.json');
console.log('Population expansion: 6,642 exact subdivision joins, retained source hashes, country totals, boundary exceptions, color values and reproducibility passed.');
