import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {placePronunciations} from '../dist/place-pronunciations.mjs';
import {expandedPronunciationCountries} from './multilingual-pronunciation-plan.mjs';
import {quizNamePlace,answerSpecified} from '../dist/quiz-modes.mjs';import {createNameRound,submitName} from '../dist/name-quiz-engine.mjs';
const all=Object.values(placePronunciations);let tested=0;
for(const country of [...expandedPronunciationCountries,'argentina','uruguay','chile','costa-rica']){
 const base=country==='south-africa'?'southern-africa/':'europe/';
 const records=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/'+base+country+'/catalogue.bin',import.meta.url)))).records.filter(r=>r.level<=(country==='belgium'?2:country==='united-kingdom'?3:1));
 assert.deepEqual(new Set(all.filter(p=>p.country===country).map(p=>p.id)),new Set(records.map(r=>r.id)),'Every requested card has audio: '+country);
 for(const r of records)for(const entry of all.filter(p=>p.country===country&&p.id===r.id)){
  const place=quizNamePlace(r);assert.equal(submitName(createNameRound([place]),entry.text).status,'correct',entry.key);
  const round={index:0,results:[],questions:[{record:r,feature:{properties:{adcode:r.id}}}]};assert.equal(answerSpecified(round,entry.text).status,'correct',entry.key);tested++;
 }
}
const owners=Object.groupBy(all,p=>p.id);assert(Object.values(owners).every(rows=>new Set(rows.map(p=>p.country)).size===1),'Spoken-name aliases use globally unambiguous record IDs');
assert.deepEqual(all.filter(p=>p.country==='belgium'&&p.id==='BE1').map(p=>p.language).sort(),['fr','nl']);
assert.deepEqual(all.filter(p=>p.country==='united-kingdom'&&p.id==='GB-C-W06000002').map(p=>p.language),['cy']);
assert(all.filter(p=>p.country==='india').every(p=>!['gom','ks','lbj','lus','kha','mni'].includes(p.language)),'Unsupported languages are never impersonated');
assert(all.filter(p=>p.country==='united-kingdom').every(p=>['en','cy','ga'].includes(p.language)));
console.log('Every requested card has audio, and all',tested,'spoken native/English forms are accepted in both typed quiz modes.');
