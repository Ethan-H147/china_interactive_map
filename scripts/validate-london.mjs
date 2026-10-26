import assert from 'node:assert/strict';
import {load} from './geo-index.mjs';
import {combineLondonSettlements,londonId,londonRegion,cityOfLondon} from './london-settlement.mjs';
import {settlementFeatures} from '../dist/settlement-layer.mjs';
const base='dist/data/europe/united-kingdom/',data=load(base+'settlements.json'),catalogue=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),london=data.records.filter(r=>r.provinceId===londonRegion);
assert.equal(london.length,1);const place=london[0];assert.equal(place.id,londonId);assert.equal(place.en,'London');assert.equal(place.parentId,londonRegion);assert.deepEqual(place.bounds,catalogue.records.find(r=>r.id===londonRegion).bounds);
assert.equal(catalogue.records.filter(r=>r.parent===londonRegion).length,33,'All borough-level administrative selections survive');
assert.equal(Object.keys(data.selectionAliases).length,33,'Old settlement links redirect to their corresponding administrative areas');
assert.equal(data.selectionAliases['GB-S-E63004906'],cityOfLondon);
assert.deepEqual(place.overview.sections.map(s=>s.title),['Greater London','City of London']);
for(const [section,id]of place.overview.sections.map((s,i)=>[s,[londonRegion,cityOfLondon][i]]))for(const metric of section.metrics){assert.equal(metric.value,stats.regions['united-kingdom:'+id][metric.type].value);assert.equal(metric.year,2024);assert(metric.source.url.startsWith('https://www.ons.gov.uk/'));}
assert.equal(place.population.value,9089736);assert.equal(place.overview.sections[1].metrics[0].value,15111,'Use City residents rather than the whole city region');
assert.equal(new Set(data.records.map(r=>r.id)).size,data.records.length);
assert.equal(settlementFeatures(data.records).features.filter(f=>f.properties.id===londonId).length,1);
assert.deepEqual(combineLondonSettlements(data,catalogue,stats),data,'Rebuilding is idempotent');
for(const name of ['Birmingham','Cardiff','Edinburgh','Belfast'])assert(data.records.some(r=>r.en===name),name+' remains a town/city dot');
console.log('London: one marker, 33 administrative areas retained, two separately sourced scopes, old links and repeatable builds passed.');
