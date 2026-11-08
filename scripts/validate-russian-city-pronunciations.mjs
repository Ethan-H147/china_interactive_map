import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {russiaPlaceNames} from '../dist/russia-names.mjs';
import {placePronunciations} from '../dist/place-pronunciations.mjs';
import {quizNamePlace,answerSpecified} from '../dist/quiz-modes.mjs';
import {createNameRound,submitName} from '../dist/name-quiz-engine.mjs';
const records=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/russia/catalogue.bin',import.meta.url)))).records;
const cities=records.filter(r=>russiaPlaceNames(r).administrativeEn&&russiaPlaceNames(r).pronunciation!==false);
assert.equal(cities.length,476);
const entries=Object.values(placePronunciations).filter(p=>p.russianScope==='urban-okrug');
assert.equal(entries.length,476);assert.deepEqual(new Set(entries.map(p=>p.id)),new Set(cities.map(r=>r.id)));
for(const record of cities){
 const names=russiaPlaceNames(record),entry=placePronunciations['russia:'+record.id];
 assert.equal(entry.text,names.local);assert(!/городской округ/i.test(entry.text));assert.equal(entry.language,'ru');assert.equal(entry.level,2);assert.equal(entry.voice,'onwK4e9ZLuTAKqWW03F9');assert.equal(entry.model,'eleven_v4');
 assert.equal(submitName(createNameRound([quizNamePlace(record)]),entry.text).status,'correct',entry.key);
 assert.equal(answerSpecified({index:0,results:[],questions:[{record,feature:{properties:{adcode:record.id}}}]},entry.text).status,'correct',entry.key);
}
console.log('476 Russian urban okrugs: exact short-name audio coverage and both typed quiz modes passed.');

// Independent place-name references catch self-consistent but incorrect adjective readings.
const cityReferences=JSON.parse(fs.readFileSync(new URL('statistics-sources/russia/cities.json',import.meta.url))).cities;
for(const c of cityReferences){const record=records.find(r=>r.id===c.id),display=russiaPlaceNames(record);assert.equal(display.local,c.local,'Use the attested settlement name: '+c.id);}
const fixture={'RU-D-58297077135629':['Vladivostok','Владивосток'],'RU-D-40490184073059':['Angarsk','Ангарск'],'RU-D-78184598260115':['Petrozavodsk','Петрозаводск'],'RU-D-13867451681945':['Aramil','Арамиль'],'RU-D-25644225360356':['Mamonovo','Мамоново']};
for(const [id,[en,local]]of Object.entries(fixture)){const display=russiaPlaceNames(records.find(r=>r.id===id));assert.equal(display.en,en);assert.equal(display.local,local);assert.equal(placePronunciations['russia:'+id].text,local);}
for(const id of ['RU-D-85685002230937','RU-D-74305253047814','RU-D-78200612798540'])assert(/ский$/.test(russiaPlaceNames(records.find(r=>r.id===id)).local),'Preserve genuine adjective-shaped town names');

for(const record of records.filter(r=>r.level===2&&!/(District|Raion|Rayon)/i.test(r.en)&&/городской округ/i.test(r.local))){assert(!/городской округ/i.test(russiaPlaceNames(record).local),'Unshortened city heading: '+record.id);}
