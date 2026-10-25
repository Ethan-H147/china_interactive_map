import assert from 'node:assert/strict';
import {createRound,advance,answer,score} from '../dist/quiz-engine.mjs';
import {answerSpecified} from '../dist/quiz-modes.mjs';
const record={id:'test',en:'Bavaria',local:'Bayern',aliases:['Free State of Bavaria']},entry={feature:{properties:{adcode:record.id}},record};
for(const value of ['Bavaria','bayern','FREE STATE OF BAVARIA']){const round=createRound([entry]);assert.equal(answerSpecified(round,value).status,'correct');assert.equal(answerSpecified(round,'Bavaria'),null);advance(round);assert(round.complete);assert.equal(score(round).correct,1);}
const round=createRound([entry]);assert.equal(answerSpecified(round,'  '),null);assert.equal(answerSpecified(round,'Berlin').status,'incorrect');assert.equal(score(round).incorrect,1);assert.equal(answerSpecified(round,'Bayern'),null);
const revealed=createRound([entry]);assert.equal(answer(revealed).status,'skipped');assert.equal(answerSpecified(revealed,'Bavaria'),null);
const accents=createRound([{feature:{properties:{adcode:'MX'}},record:{id:'MX',en:'México',local:'México'}}]);assert.equal(answerSpecified(accents,'mexico').status,'correct');
console.log('Specified-place quiz: English/local names, aliases, accents, empty answers, wrong answers, reveal scoring and duplicate prevention passed.');

// Close spelling attempts are warnings, never silent matches or hints.
for(const typo of ['Bavria','Bavaira','Bavari']){const q=createRound([entry]);for(let n=1;n<=2;n++){const warning=answerSpecified(q,typo);assert.equal(warning.status,'spelling');assert.equal(warning.warnings,n);assert.equal(q.results.length,0);assert.equal(score(q).incorrect,0);}assert.equal(answerSpecified(q,typo).status,'incorrect');assert.equal(score(q).incorrect,1);}
const corrected=createRound([entry]);assert.equal(answerSpecified(corrected,'Bavria').status,'spelling');assert.equal(answerSpecified(corrected,'Bavaria').status,'correct');assert.equal(score(corrected).correct,1);
const other=[{feature:{properties:{adcode:'IA'}},record:{id:'IA',en:'Iowa'}},{feature:{properties:{adcode:'IN'}},record:{id:'IN',en:'Iona'}}],known=createRound(other,'all',()=>.999);assert.equal(answerSpecified(known,'Iona').status,'incorrect','A different exact place name is not treated as a typo');advance(known);assert.equal(answerSpecified(known,'Ioa').warnings,1,'Warning allowance resets for each question');
for(const code of [820000,'820000'])for(const en of ['Macao','Macau'])for(const value of ['Macao','Macau']){const q=createRound([{feature:{properties:{adcode:code}},record:{id:code,en}}]);assert.equal(answerSpecified(q,value).status,'correct');}
console.log('Spelling grace: two warnings, third close attempt wrong, correction accepted, per-question reset, known wrong names and Macao/Macau aliases passed.');

const shortPlace=createRound([{feature:{properties:{adcode:'GOA'}},record:{id:'GOA',en:'Goa'}}]);assert.equal(answerSpecified(shortPlace,'Gao').status,'spelling','A short full place name still gets typo grace');

for(const en of ['Jeonbuk','North Jeolla'])for(const value of ['Jeonbuk','North Jeolla','north jeolla']){
 const q=createRound([{feature:{properties:{adcode:'KR-52'}},record:{id:'KR-52',en,local:'전북특별자치도'}}]);
 assert.equal(answerSpecified(q,value).status,'correct');assert.equal(q.spellingWarnings||0,0);assert.equal(score(q).correct,1);
}
console.log('Jeonbuk / North Jeolla: both names accepted immediately in highlighted-place quizzes.');
