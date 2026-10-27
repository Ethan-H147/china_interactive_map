import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import '../dist/countries.js';
import {firstLevelPool} from '../dist/first-level-quiz.mjs';
import {quizNamePlace,answerSpecified} from '../dist/quiz-modes.mjs';
import {createNameRound,submitName} from '../dist/name-quiz-engine.mjs';
import {createRound} from '../dist/quiz-engine.mjs';
const definition=globalThis.AtlasCountries.countries['united-states'];
assert.equal(definition.quiz.title,'State quiz');
assert.equal(definition.quiz.plural,'States');
const records=JSON.parse(gunzipSync(fs.readFileSync('dist/'+definition.colors.catalogue))).records;
const pool=firstLevelPool(records),dc=pool.find(r=>r.id==='US-DC');
assert.equal(pool.length,51);
assert(dc,'DC stays in the state quiz');
for(const value of ['District of Columbia','Washington DC','Washington, D.C.','Washington D.C.','washington dc','DC','D.C.','Washington, District of Columbia']){
 const naming=createNameRound(pool.map(quizNamePlace));
 const result=submitName(naming,value);
 assert.equal(result.status,'correct',value+' in name-every-state mode');
 assert.equal(result.place.code,'US-DC');
 const highlighted=createRound([{feature:{properties:{adcode:dc.id}},record:dc}]);
 assert.equal(answerSpecified(highlighted,value).status,'correct',value+' in highlighted-place mode');
}
const naming=createNameRound(pool.map(quizNamePlace));
assert.equal(submitName(naming,'Washington').place.code,'US-WA','Bare Washington means Washington state');
assert.equal(submitName(naming,'Washington DC').place.code,'US-DC');
assert.equal(submitName(naming,'D.C.').status,'duplicate','Aliases share one answer');
console.log('State quiz title, 51-place pool, DC aliases in both typed modes, Washington state and duplicate answers passed.');
