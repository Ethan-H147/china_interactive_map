import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {italianNameRows,italianCardNames} from '../dist/italian-names.mjs';
import {regionalNameRows} from '../dist/regional-names.mjs';
import {aliases,normalizeName,createNameRound,submitName} from '../dist/name-quiz-engine.mjs';
import {quizNamePlace,answerSpecified} from '../dist/quiz-modes.mjs';
const {records}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/europe/italy/catalogue.bin',import.meta.url))));
let checked=0;
for(const r of records){
 const rows=italianNameRows(r),card=italianCardNames(r);
 assert(!card.en.includes('/')&&!card.local.includes('/'));
 if(rows.length<2)continue;
 const candidates=rows.slice(1).map(([language,lang,text])=>({language,lang,text}));
 const displayed=regionalNameRows({...r,regionalNames:candidates},[card.en,card.local]);
 for(const name of displayed)assert(['German','French'].includes(name.language));
 const place=quizNamePlace(r);
 for(const [, ,name]of rows){assert(aliases(place).has(normalizeName(name)));assert.equal(submitName(createNameRound([place]),name).status,'correct');const round={index:0,results:[],questions:[{record:r,feature:{properties:{adcode:r.id}}}]};assert.equal(answerSpecified(round,name).status,'correct');checked++;}
}
assert.deepEqual(italianNameRows(records.find(r=>r.id==='IT-P-21')),[['Italian','it','Bolzano'],['German','de','Bozen']]);
console.log('Italian bilingual card forms and naming-quiz aliases verified:',checked,'forms.');
