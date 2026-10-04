import assert from 'node:assert/strict';
import fs from 'node:fs';
import {candidates} from '../dist/quiz-engine.mjs';
import {createNameRound,submitName,nameHint,nameScore,serializeNameRound,shortEnglish,shortChinese} from '../dist/name-quiz-engine.mjs';
import {readData} from './read-data.mjs';
const names=readData('region-names.json').regions;
const layers=readData('display-boundaries.json').subdivisions.features.map(feature=>({feature}));
const places=scope=>candidates(layers,{scope}).map(l=>({code:l.feature.properties.adcode,en:names[l.feature.properties.adcode].en,zh:l.feature.properties.name}));
const round=createNameRound(places('420000'));
assert.equal(round.places.length,13);
assert.equal(submitName(round,'  Wǔ Hàn  ').status,'correct');
assert.equal(submitName(round,'武汉市').status,'duplicate');
assert.equal(submitName(round,'襄阳').status,'correct');
assert.equal(submitName(round,'Enshi').status,'correct');
assert.equal(submitName(round,'Shanghai').status,'unknown');
assert.equal(submitName(round,'wuham').status,'unknown','Do not silently accept a typo');
assert.equal(submitName(round,'').status,'empty');
const hint=nameHint(round);assert(!round.found.has(hint.place.code));
assert.equal(submitName(round,hint.place.zh).status,'correct');
assert.equal(nameScore(round).unassisted,3);
round.elapsed=42000;
const resumed=createNameRound(places('420000'),serializeNameRound(round));
assert.deepEqual(nameScore(resumed),nameScore(round));assert.equal(resumed.elapsed,42000);
assert.equal(createNameRound(places('420000'),{found:[110100],hinted:[110100]}).found.size,0);
for(const p of resumed.places)submitName(resumed,p.zh);
assert(resumed.complete);assert.equal(nameScore(resumed).found,13);
assert.equal(submitName(resumed,'Wuhan').status,'complete');
assert.equal(nameHint(resumed),null);
const xinjiang=createNameRound(places('650000'));assert.equal(submitName(xinjiang,'kashi').status,'correct');
const taiwan=createNameRound(places('710000'));assert.equal(submitName(taiwan,'Hsinchu').status,'ambiguous');
assert.equal(submitName(taiwan,'新竹縣').status,'correct');
assert.equal(submitName(taiwan,'新竹市').status,'correct');
const provinceCodes=new Set(candidates(layers).map(l=>l.feature.properties.provinceCode));
let total=0;
for(const scope of provinceCodes){
  const pool=places(String(scope));
  for(const p of pool){
    for(const value of [p.en,p.zh])assert.equal(submitName(createNameRound(pool),value).status,'correct',`${scope}: ${value}`);
    assert(shortEnglish(p.en));assert(shortChinese(p.zh));total++;
  }
}
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Duplicate UI IDs');
console.log(`Name quiz: ${total} places accept their full English and Chinese names; accents, short names, duplicate answers, hints, scope, completion and resume validated.`);
