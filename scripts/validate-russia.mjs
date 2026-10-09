import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {russiaPlaceNames} from '../dist/russia-names.mjs';
import {russiaFlags} from '../dist/russia-flags.mjs';
import {validate,hashFor,fromHash} from '../dist/view-state.mjs';
const base='dist/data/russia/',read=name=>JSON.parse(gunzipSync(fs.readFileSync(base+name)));
const catalogue=read('catalogue.bin'),first=read('first.bin'),stats=JSON.parse(fs.readFileSync(base+'statistics.json'));
const regions=catalogue.records.filter(r=>r.level===1),districts=catalogue.records.filter(r=>r.level===2);
const nativeNames=JSON.parse(fs.readFileSync('scripts/name-sources/russia-district-names.json','utf8'));
const evidenceBytes=fs.readFileSync(nativeNames.provenance.evidence);
assert.equal(createHash('sha256').update(evidenceBytes).digest('hex'),nativeNames.provenance.evidenceSha256,'Pinned native-name evidence matches its provenance');
const evidence=new Map(JSON.parse(gunzipSync(evidenceBytes)).elements.map(e=>[e.id,e]));
assert.equal(Object.keys(nativeNames.names).length,2327,'Every original boundary record has a verified native name');
for(const r of districts){
 assert(/[А-Яа-яЁё]/.test(r.local||''),'Missing Russian district name: '+r.id);
 const name=nativeNames.names[r.id];if(!name)continue;
 assert.equal(r.local,name.local,'Catalogue retains the sourced Russian name');
 const tags=evidence.get(name.relation)?.tags;assert(tags,'Native name links to the original OSM record');
 assert([tags['name:ru'],tags.name].includes(name.local),'Native name comes directly from source tags');
}
assert.equal(regions.length,83);assert.equal(first.regions.features.length,83);
assert.equal(districts.length,2357);assert.equal(new Set(catalogue.records.map(r=>r.id)).size,catalogue.records.length);
assert.equal(Object.keys(catalogue.chunks).length,83);assert.equal(Object.keys(russiaFlags).length,83);
assert.equal(catalogue.chunks['RU-MOW'].count,12);assert.equal(catalogue.chunks['RU-SPE'].count,18);
let districtCount=0;
for(const r of regions){
 const s=stats.regions['russia:'+r.id];assert(s,r.id);
 for(const metric of ['population','area','gdp','gdpPerCapita']){assert(s[metric].value>0);assert(stats.sources[s[metric].source]);}
 assert.equal(s.gdp.year,2024);assert.equal(s.gdpPerCapita.year,2024);
 assert.equal(s.gdp.exchangeYear,2024);assert(Math.abs(s.gdp.usd*s.gdp.exchangeRate-s.gdp.value)<.05);
 assert.equal(s.population.periodLabel,'1 January 2025 · preliminary estimate');
 assert(fs.statSync('dist/'+russiaFlags[r.id].file).size>100);
 const chunk=catalogue.chunks[r.id],detail=read(chunk.file);assert.equal(detail.regions.features.length,chunk.count);
 assert(chunk.bytes<2_000_000,'Region chunk stays below 2 MB compressed');
 assert(chunk.decodedBytes<12_000_000,'Per-region decoded geometry remains bounded');
 assert.equal(detail.regions.features.length,districts.filter(d=>d.parent===r.id).length);
 for(const f of detail.regions.features){assert.equal(f.properties.parent,r.id);const record=districts.find(d=>d.id===f.properties.id);assert.equal(f.properties.local,record.local,'Map geometry and sidebar use the same Russian name');assert.equal(f.properties.en,record.en);}
 for(const f of detail.boundaries.features)assert.equal(f.properties.owners.length,2,'Only shared district edges are drawn');
 districtCount+=chunk.count;
}
assert.equal(districtCount,districts.length);
for(const d of districts)assert(!stats.regions['russia:'+d.id],'Districts never inherit parent statistics');
assert.equal(stats.regions['russia:RU-TYU'].gdp.value,2_213_672_500_000);
assert.equal(stats.regions['russia:RU-ARK'].gdp.value,840_732_800_000);
for(const f of first.boundaries.features)assert.equal(f.properties.owners.length,2,'Regional lines exclude coasts');
const border=read('international.bin');
for(const neighbor of ['china','mongolia','north-korea'])assert(border.features.some(f=>f.properties.neighbor===neighbor&&f.geometry.coordinates.length>1));
assert(fs.statSync(base+'context.bin').size<600_000,'Country startup uses a lightweight outline');
const search=createPlaceSearch(catalogue.records);
assert.equal(search('Moscow')[0].id,'RU-MOW');assert.equal(search('Москва')[0].id,'RU-MOW');
assert.equal(search('Залесовский район')[0].id,'RU-D-4456705023114','New native labels are searchable');
assert.equal(search('Рубцовский район')[0].id,'RU-D-95632257634540','District search preserves the correct area instead of the same-named city');
assert(search('Zelenograd').some(r=>r.parent==='RU-MOW'));assert(search('Kolpinsky').some(r=>r.parent==='RU-SPE'));
const view={v:1,country:'russia',center:[183,65],zoom:6,selection:'RU-CHU',mode:2,layers:{'ru-second-layer':true}};
assert.deepEqual(fromHash(hashFor(view)),validate(view),'Views preserve Chukotka across the date line');
assert.equal(validate({...view,country:'china'}),null,'Other countries retain their longitude validation');
console.log('Russia: 83 regions, 2,357 second-level areas, all regional cards and flags, bounded region chunks, inland-only outlines, both-language search and date-line view links passed.');

const tyumen=districts.find(r=>r.id==='RU-D-55944525718876'),tyumenNames=russiaPlaceNames(tyumen);
assert.equal(tyumenNames.en,'Tyumen');assert.equal(tyumenNames.local,'Тюмень');assert.equal(tyumenNames.administrativeEn,'Tyumen Urban Okrug');assert.equal(tyumenNames.administrativeLocal,tyumen.local);
assert.equal(russiaPlaceNames(districts.find(r=>r.en==='Tyumensky District')).en,'Tyumensky District','Ordinary districts stay distinct from the city');
assert.equal(tyumen.en,'Urban District Tyumen','Sourced names remain unchanged and searchable');
assert.equal(russiaPlaceNames({level:2,en:'Saransk Urban District',local:'городской округ Саранск',kind:'City / urban district'}).en,'Saransk');
assert.equal(russiaPlaceNames({level:2,en:'Khanty-Mansiysk Urban Okrug',local:'городской округ Ханты-Мансийск',kind:'City / urban district'}).en,'Khanty-Mansiysk');
console.log('City map names and sidebar administrative names stay separate without changing district identity.');
