import {validate} from '../dist/view-state.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {load} from './geo-index.mjs';
import {configurations} from '../dist/europe.mjs';
import {splitSouthAmericaContext} from '../dist/south-america-context.mjs';
const context=splitSouthAmericaContext(load('dist/data/flight-context.bin'));
const runtime=fs.readFileSync('dist/app.js','utf8'),loader=fs.readFileSync('dist/gpu-loader.js','utf8');
assert(!runtime.includes('AtlasSouthAmerica')&&!runtime.includes('southAmerica.'),'The retired renderer is never installed or invoked');
assert(!loader.includes('south-america.mjs'),'Startup does not load the retired adapter');
for(const country of ['brazil','argentina','uruguay']){
 assert.equal(globalThis.AtlasCountries.countries[country].adapter,'europe');
 assert(configurations[country].deferOutlines);
 const base='dist/data/europe/'+country+'/',old='dist/data/south-america/',first=load(old+country+'-first.bin'),migrated=load(base+configurations[country].firstFile),catalogue=load(base+'catalogue.bin'),local=load(old+country+'-local/index.bin');
 assert.deepEqual(migrated.regions,first.regions,'All polygon coordinates and properties retained: '+country);
 assert.deepEqual(migrated.lines,first.lines,'All subdivision lines retained: '+country);
 const retained=load(base+'context.bin');assert.deepEqual(retained.features.map(f=>f.geometry),context.features.filter(f=>f.properties.country===country).map(f=>f.geometry),'Context coordinates retained: '+country);
 for(const record of [...first.records,...local.records])assert(catalogue.records.some(r=>r.id===record.id),'Record retained: '+record.id);
 for(const [id,chunk]of Object.entries(catalogue.chunks))assert.equal(path.resolve(base,chunk.file),path.resolve(old+country+'-local/'+local.groups[id].file),'Scoped source reused without copying: '+id);
 assert.equal(globalThis.AtlasCountries.countries[country].statistics,'data/south-america/'+country+'-statistics.json','Original statistics reused');
 assert(!fs.existsSync(base+'first.bin')&&!fs.existsSync(base+'statistics.json'),'No duplicate first-level or statistics files');
 console.log(country+': original polygons, lines, contexts, records, scoped chunks and statistics preserved.');
}
const cities=load('dist/data/south-america/argentina-cities/index.bin'),arg=load('dist/data/europe/argentina/catalogue.bin');
assert.equal(arg.records.filter(r=>r.point).length,cities.records.length);
for(const city of cities.records)assert(arg.records.some(r=>r.id===city.id)||arg.selectionAliases[city.id],'City selection retained: '+city.id);
assert.equal(arg.selectionAliases['AR-CITY-01'],'AR-02');
const ddd=load('dist/data/europe/brazil/ddd/catalogue.bin'),original=load('dist/data/south-america/brazil-ddd.bin');
assert.equal(ddd.records.length,original.records.length);
for(const record of ddd.records){const before=original.records.find(r=>r.id===record.id);for(const key of ['bounds','municipalities','aliases','states'])assert.deepEqual(record[key],before[key]);assert(record.parents.length);}
assert.deepEqual(globalThis.AtlasCountries.countries.brazil.view.scopes,['states','ddd','cep']);
console.log('Shared renderer migration: all city markers and links, CABA alias, DDD assignments and CEP availability retained.');

for(const [country,prefix]of [['brazil','br'],['argentina','ar'],['uruguay','uy']]){const saved=validate({v:1,country,center:[-56,-30],zoom:5,layers:{'south-outlines':false,'south-names':false,'south-city-dots':false}});assert.equal(saved.layers[prefix+'-province-layer'],false);assert.equal(saved.layers[prefix+'-second-layer'],false);assert.equal(saved.layers[prefix+'-label-layer'],false);if(country==='argentina')assert.equal(saved.layers['ar-reference-points'],false);}
console.log('Existing saved outline, name and city-marker settings migrate to shared controls.');
