import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {firstLevelPool} from '../dist/first-level-quiz.mjs';
import {createNameRound,submitName} from '../dist/name-quiz-engine.mjs';
import {quizNamePlace} from '../dist/quiz-modes.mjs';
const index=JSON.parse(fs.readFileSync('dist/data/quiz/us-counties/index.json')),library=JSON.parse(fs.readFileSync('dist/data/quiz/library.json'));assert.equal(index.scopes.length,50);assert.equal(library.usCountyScopes.length,50);assert(!index.scopes.some(s=>s.id==='US-DC'));
let total=0;
for(const scope of index.scopes){const data=JSON.parse(gunzipSync(fs.readFileSync('dist/'+scope.file))),pool=firstLevelPool(data.records,false,[],2);assert.equal(pool.length,scope.count,scope.label+' includes every county/equivalent');assert(pool.every(r=>r.parent===scope.id));assert.equal(data.regions.features.length,pool.length);assert.deepEqual(new Set(data.regions.features.map(f=>f.properties.id)),new Set(pool.map(r=>r.id)));const round=createNameRound(pool.map(quizNamePlace));for(const r of pool)assert.equal(submitName(round,r.en).status,'correct',r.en);assert(round.complete);total+=scope.count;}
assert.equal(total,3143);assert.equal(index.scopes.find(s=>s.id==='US-TX').count,254);assert.equal(index.scopes.find(s=>s.id==='US-HI').count,5);assert.equal(index.scopes.find(s=>s.id==='US-CT').count,9);assert.equal(index.scopes.find(s=>s.id==='US-AK').count,30);
console.log('US county quizzes: all 50 state scopes, 3,143 county/equivalent polygons and full-name answers; Texas, Hawaii, Connecticut and Alaska coverage passed.');
