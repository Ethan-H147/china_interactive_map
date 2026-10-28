import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../dist/countries.js';
import {cityQuizLevels} from './us-city-quiz-definitions.mjs';
const data=JSON.parse(fs.readFileSync('dist/data/quiz/us-cities.json','utf8')),levels=globalThis.AtlasCountries.countries['united-states'].quiz.cities.levels;
assert.deepEqual(levels,cityQuizLevels,'The app and the build use the same difficulties and medals');
assert.deepEqual(data.levels.map(l=>l.count),[18,36,68,134,232],'Levels are cumulative');
assert.equal(new Set(data.records.map(r=>r.id)).size,data.records.length);
for(const level of data.levels.map(l=>l.id)){const pool=data.records.filter(r=>data.levels.findIndex(l=>l.id===r.tier)<=data.levels.findIndex(l=>l.id===level));assert.equal(new Set(pool.map(r=>r.en)).size,pool.length,'Displayed names are unique in '+level);}
for(const r of data.records){assert(r.center[0]>-170&&r.center[0]<-66&&r.center[1]>18&&r.center[1]<72,r.en+' lies in the US');assert(r.aliases.length&&r.state&&r.stateName);}
for(const [name,state] of [['Seattle','US-WA'],['Fairbanks','US-AK'],['Portland, Maine','US-ME'],['Washington, D.C.','US-DC']])assert.equal(data.records.find(r=>r.en===name)?.state,state,name);
assert.equal(data.records.find(r=>r.en==='Fairbanks').tier,'expert');assert.equal(data.records.find(r=>r.en==='San Jose').tier,'hard','Easier levels keep only anchor cities');
console.log('US city quiz:',data.records.length,'cities, cumulative levels',data.levels.map(l=>l.label+' '+l.count).join(', '),'and unique names passed.');
