import assert from 'node:assert/strict';
import {createRound,advance,answer,score} from '../dist/quiz-engine.mjs';
import {answerSpecified} from '../dist/quiz-modes.mjs';
const record={id:'test',en:'Bavaria',local:'Bayern',aliases:['Free State of Bavaria']},entry={feature:{properties:{adcode:record.id}},record};
for(const value of ['Bavaria','bayern','FREE STATE OF BAVARIA']){const round=createRound([entry]);assert.equal(answerSpecified(round,value).status,'correct');assert.equal(answerSpecified(round,'Bavaria'),null);advance(round);assert(round.complete);assert.equal(score(round).correct,1);}
const round=createRound([entry]);assert.equal(answerSpecified(round,'  '),null);assert.equal(answerSpecified(round,'Berlin').status,'incorrect');assert.equal(score(round).incorrect,1);assert.equal(answerSpecified(round,'Bayern'),null);
const revealed=createRound([entry]);assert.equal(answer(revealed).status,'skipped');assert.equal(answerSpecified(revealed,'Bavaria'),null);
const accents=createRound([{feature:{properties:{adcode:'MX'}},record:{id:'MX',en:'México',local:'México'}}]);assert.equal(answerSpecified(accents,'mexico').status,'correct');
console.log('Specified-place quiz: English/local names, aliases, accents, empty answers, wrong answers, reveal scoring and duplicate prevention passed.');
