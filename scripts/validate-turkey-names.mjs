import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {placeLines} from '../dist/settlement-layer.mjs';
const base='dist/data/europe/turkey/',cat=load(base+'catalogue.bin'),cities=load(base+'settlements.json').records,all=[...cat.records,...cities],index=new Map(all.map(r=>[r.id,r])),search=createPlaceSearch(all);
const expected={'TR-R-TR1':'İstanbul','TR-P-34':'İstanbul','TR-P-35':'İzmir','TR-P-32':'Isparta','TR-P-76':'Iğdır','TR-D-034023':'Kadıköy','TR-S-1882099475':'İstanbul'};
assert.equal(cat.records.filter(r=>r.level===1).length,12);assert.equal(cat.records.filter(r=>r.level===2).length,81);assert.equal(cat.records.filter(r=>r.level===3).length,973);assert.equal(cities.length,82);
for(const [id,name]of Object.entries(expected)){const r=index.get(id);assert.equal(r.en,name,id);assert.equal(r.local,name,id);assert.equal(r.names.tr,name,id);assert.deepEqual(placeLines(r,'tr'),[name]);assert.deepEqual(placeLines(r,'both'),[name],'Identical names appear once');}
for(const [query,id]of [['Istanbul','TR-P-34'],['İstanbul','TR-P-34'],['ISTANBUL','TR-P-34'],['Izmir','TR-P-35'],['İzmir','TR-P-35'],['Igdir','TR-P-76'],['Iğdır','TR-P-76'],['Kadikoy Belediyesi','TR-D-034023'],['Kadıköy Belediyesi','TR-D-034023'],['Isparta','TR-P-32']])assert(search(query).some(r=>r.id===id),query+' remains searchable');
for(const r of all){assert.equal(r.en,r.en.normalize('NFC'));assert.equal(r.local,r.local.normalize('NFC'));assert(!r.local.includes('i\u0307'),r.id+' has composed Turkish characters');assert.equal(r.localLang,'tr');if(r.level>1||r.settlement){assert(r.municipality,r.id+' has a verified municipal government');assert.equal(r.municipality.source,'https://www.tbb.gov.tr/tr/buyuksehir-ve-il-belediyeleri');assert.equal(r.relatedGovernmentLocal,r.municipality.name);assert(r.relatedGovernmentLocal.endsWith(' Belediyesi'));assert(!r.administrativeEn,'Related government does not replace the polygon kind');}}
assert.equal(index.get('TR-P-34').kind,'Province');assert.equal(index.get('TR-D-034023').kind,'District');assert.equal(index.get('TR-P-34').kindLocal.toLocaleUpperCase('tr'),'İL');assert.equal(index.get('TR-D-034023').kindLocal.toLocaleUpperCase('tr'),'İLÇE');
assert.equal(index.get('TR-P-34').relatedGovernmentLocal,'İstanbul Büyükşehir Belediyesi');assert.equal(index.get('TR-D-034023').relatedGovernmentLocal,'Kadıköy Belediyesi');assert.equal(index.get('TR-S-125351451').kind,'City','Ceyhan is not a province centre');
assert.equal(index.get('TR-R-TR3').en,'Aegean');assert.deepEqual(placeLines(index.get('TR-R-TR3'),'both'),['Aegean','Ege']);
const manifest=load('scripts/name-sources/turkey/manifest.json'),raw=fs.readFileSync('scripts/name-sources/turkey/municipalities.html');assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.files['municipalities.html'].sha256);
assert.deepEqual(load(base+'regional-names.json').coverage,{regions:12,provinces:81,districts:973,cityDots:82,municipalNames:1136});
for(const [key,r]of Object.entries(load(base+'statistics.json').regions)){const record=index.get(key.split(':')[1]);if(record)assert.equal(r.name,record.en,key+' statistics name');}
console.log('Turkey names: Turkish casing, 1,148 bilingual records, 1,136 municipal references, ASCII search, label languages and statistics names passed.');
