import fs from'node:fs';import assert from'node:assert/strict';import{gunzipSync}from'node:zlib';
import{placePronunciations}from'../dist/place-pronunciations.mjs';import{swissNameRows,swissSecondaryNameRows}from'../dist/swiss-names.mjs';
import{quizNamePlace,answerSpecified}from'../dist/quiz-modes.mjs';import{createNameRound,submitName}from'../dist/name-quiz-engine.mjs';
let total=0;for(const[country,count]of Object.entries({thailand:77,bulgaria:28,austria:9,switzerland:26})){
 const records=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/europe/'+country+'/catalogue.bin',import.meta.url)))).records.filter(r=>r.level===1),entries=Object.values(placePronunciations).filter(p=>p.country===country);assert.equal(records.length,count);assert.deepEqual(new Set(entries.map(p=>p.id)),new Set(records.map(r=>r.id)));
 for(const r of records){const es=entries.filter(e=>e.id===r.id),forms=country==='switzerland'?swissNameRows(r).filter(n=>n.lang!=='rm'):[{lang:{thailand:'th',bulgaria:'bg',austria:'de'}[country],text:r.local}];assert.deepEqual(es.map(e=>[e.language,e.text]),forms.map(n=>[n.lang,n.text]));
  for(const e of es){assert.equal(e.level,1);assert.equal(e.provider,'ElevenLabs');assert.equal(e.voice,'onwK4e9ZLuTAKqWW03F9');assert.equal(e.model,'eleven_v4');const place=quizNamePlace(r);assert.equal(submitName(createNameRound([place]),e.text).status,'correct',e.key);assert.equal(answerSpecified({index:0,results:[],questions:[{record:r,feature:{properties:{adcode:r.id}}}]},e.text).status,'correct');total++;}
 }
}
assert.equal(total,144);assert.deepEqual(Object.values(placePronunciations).filter(e=>e.country==='switzerland'&&e.id==='CH-K-18').map(e=>e.language),['de','it']);assert(!Object.values(placePronunciations).some(e=>e.language==='rm'));
const gr=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/switzerland/catalogue.bin'))).records.find(r=>r.id==='CH-K-18');assert.equal(submitName(createNameRound([quizNamePlace(gr)]),'Grischun').status,'correct','Written Romansh remains accepted');
console.log('140 first-level cards, 144 exact native-name recordings, Swiss official-language variants and typed quiz aliases verified.');

for(const [id,en,local,expected]of[['CH-K-2','Bern','Bern',['Berne']],['CH-K-10','Fribourg','Fribourg',['Freiburg']],['CH-K-23','Valais','Valais',['Wallis']],['CH-K-18','Grisons','Graubünden',['Graubünden','Grigioni','Grischun']]])assert.deepEqual(swissSecondaryNameRows({id,en,local,level:1}).map(n=>n.text),expected,'No duplicate Swiss title form');
