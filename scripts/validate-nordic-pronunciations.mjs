import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {placePronunciations} from '../dist/place-pronunciations.mjs';
import {nordicPronunciationCountries} from './nordic-pronunciation-plan.mjs';
import {quizNamePlace,answerSpecified} from '../dist/quiz-modes.mjs';
import {createNameRound,submitName} from '../dist/name-quiz-engine.mjs';

const all=Object.values(placePronunciations);let tested=0,cards=0;
const expected={denmark:13,finland:48,iceland:13,norway:25,sweden:26};
for(const country of nordicPronunciationCountries){
 const base=new URL('../dist/data/europe/'+country+'/',import.meta.url);
 const first=JSON.parse(gunzipSync(fs.readFileSync(new URL('catalogue.bin',base)))).records.filter(r=>r.level===1);
 const cities=JSON.parse(fs.readFileSync(new URL('settlements.json',base))).records.slice().sort((a,b)=>(b.population?.value||0)-(a.population?.value||0)||a.id.localeCompare(b.id)).slice(0,5);
 const entries=all.filter(p=>p.country===country),records=[...first,...cities];
 assert.equal(entries.length,expected[country]);cards+=records.length;
 assert.deepEqual(new Set(entries.map(p=>p.id)),new Set(records.map(r=>r.id)),'Complete first-level and top-five urban-area coverage: '+country);
 assert.equal(new Set(entries.filter(p=>p.nordicScope==='city').map(p=>p.id)).size,5);
 for(const record of records){
  const forms=entries.filter(p=>p.id===record.id);
  assert.equal(forms.length,country==='finland'?2:1);
  if(country==='finland')assert.deepEqual(forms.map(p=>p.language).sort(),['fi','sv']);
  for(const entry of forms){
   assert.equal(entry.provider,'ElevenLabs');assert.equal(entry.voice,'onwK4e9ZLuTAKqWW03F9');assert.equal(entry.model,'eleven_v4');
   const place=quizNamePlace(record);
   assert.equal(submitName(createNameRound([place]),entry.text).status,'correct',entry.key);
   const round={index:0,results:[],questions:[{record,feature:{properties:{adcode:record.id}}}]};
   assert.equal(answerSpecified(round,entry.text).status,'correct',entry.key);tested++;
  }
 }
}
assert.equal(placePronunciations['denmark:DK-GL'].text,'Grønland');
assert.equal(placePronunciations['denmark:DK-FO'].text,'Færøerne');
assert.equal(placePronunciations['denmark:DK-FO'].language,'da');
assert.equal(placePronunciations['finland:FI-21'].language,'sv','Åland uses Swedish as its primary pronunciation');
assert.equal(cards,101);assert.equal(tested,125);
console.log('Nordic pronunciation: 125 recordings, all 76 first-level cards and 25 largest urban areas; spoken names accepted in both typed quiz modes.');
