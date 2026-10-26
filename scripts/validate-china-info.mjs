import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyChinaSearchAliases,taiwanPinyin,historicalCityAliases,normalizeChinaSearch} from '../dist/china-search-aliases.mjs';
const data=JSON.parse(fs.readFileSync('dist/data/china-regions.json'));
const regions=[...data.provinces,...data.subdivisions,...data.districts];
assert.equal(Object.keys(taiwanPinyin).length,22);
for(const [code,names] of Object.entries({...taiwanPinyin,...historicalCityAliases})){
 const original=regions.find(r=>String(r.properties.adcode)===code)?.properties;assert(original,code);
 const p=structuredClone(original);p.searchAliases='Existing alias';applyChinaSearchAliases(p);
 for(const name of names)assert(p.searchAliases.split(';').includes(name),code+' '+name);
 const once=p.searchAliases;applyChinaSearchAliases(p);assert.equal(p.searchAliases,once);
 assert.equal(p.name,original.name);assert.equal(p.englishName,original.englishName);assert(p.searchAliases.includes('Existing alias'));
}
assert.equal(normalizeChinaSearch('Tái běi'),'taibei');
console.log('All 22 Taiwan aliases and 12 historical city mappings validated.');
