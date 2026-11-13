import assert from 'node:assert/strict';
import fs from 'node:fs';
import {candidates} from '../dist/quiz-engine.mjs';
import {createNameRound,submitName,nameHint,nameScore,serializeNameRound,shortEnglish,shortChinese,ambiguousNameMessage} from '../dist/name-quiz-engine.mjs';
import {readData} from './read-data.mjs';
const names=readData('region-names.json').regions;
const qualified=[{code:321200,en:'Taizhou',zh:'泰州市',qualifiers:['Jiangsu','江苏省','江苏']},{code:331000,en:'Taizhou',zh:'台州市',qualifiers:['Zhejiang','浙江省','浙江']}];
const ambiguousRound=createNameRound(qualified),ambiguous=submitName(ambiguousRound,'taizhou');
assert.equal(ambiguous.status,'ambiguous');assert.equal(ambiguousRound.found.size,0);
assert.match(ambiguousNameMessage(ambiguous),/Add the province before or after the name/);assert.doesNotMatch(ambiguousNameMessage(ambiguous),/Jiangsu|Zhejiang|泰州|台州/);assert.doesNotMatch(ambiguousNameMessage({matches:qualified.map(({qualifiers,...p})=>p)}),/泰州|台州/);
for(const answer of ['Taizhou Jiangsu','Jiangsu Taizhou','Taizhou (Jiangsu)','taizhou, jiangsu','江苏泰州','泰州市江苏省'])assert.equal(submitName(createNameRound(qualified),answer).place?.code,321200,answer);
for(const answer of ['Taizhou Zhejiang','Zhejiang Taizhou','台州','台州市','浙江台州'])assert.equal(submitName(createNameRound(qualified),answer).place?.code,331000,answer);
assert.equal(submitName(createNameRound(qualified),'泰州').place.code,321200);
assert.equal(submitName(ambiguousRound,'Taizhou Jiangsu').status,'correct');assert.equal(submitName(ambiguousRound,'Jiangsu Taizhou').status,'duplicate');assert.equal(submitName(ambiguousRound,'taizhou').status,'ambiguous');
assert.notEqual(submitName(createNameRound(qualified),'Taizhou Guangdong').status,'correct','An unrelated province must not disambiguate a city');
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
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8')+fs.readFileSync(new URL('../dist/china-page.mjs',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Duplicate UI IDs');
console.log(`Name quiz: ${total} places accept their full English and Chinese names; accents, short names, duplicate answers, hints, scope, completion and resume validated.`);

const spellingPlaces=[{code:'CA',en:'California',zh:''},{code:'TX',en:'Texas',zh:''}],spellingRound=createNameRound(spellingPlaces);assert.equal(submitName(spellingRound,'Californa').status,'spelling');assert.equal(nameScore(spellingRound).found,0);assert.equal(nameScore(spellingRound).hints,0);const savedSpelling=createNameRound(spellingPlaces,serializeNameRound(spellingRound));assert.equal(submitName(savedSpelling,'Califorina').status,'spelling');assert.equal(submitName(savedSpelling,'Californi').status,'spelling');assert.equal(savedSpelling.found.size,0);assert.equal(submitName(savedSpelling,'California').status,'correct');assert.equal(nameScore(savedSpelling).unassisted,1);assert.equal(submitName(savedSpelling,'Texa').status,'spelling');assert.equal(submitName(createNameRound([{code:1,en:'Maine',zh:''},{code:2,en:'Maize',zh:''}]),'Maie').status,'unknown','Ambiguous near-spellings do not reveal a candidate');
for(const code of [820000,'820000'])for(const en of ['Macao','Macau'])for(const value of ['Macao','Macau'])assert.equal(submitName(createNameRound([{code,en,zh:'澳门'}]),value).status,'correct');
console.log('Naming grace: unlimited counter-free spelling prompts, no automatic answers or hint penalty, ambiguous matches and both Macau spellings passed.');

// The Korean province accepts both English names without spelling warnings.
for(const en of ['Jeonbuk','North Jeolla'])for(const value of ['Jeonbuk','North Jeolla','north jeolla']){
 const province={code:'KR-52',en,zh:'전북특별자치도'},q=createNameRound([province,{code:'KR-26',en:'Busan',zh:''}]);
 assert.equal(submitName(q,value).status,'correct');assert.equal(q.spellingWarnings.size,0);
 assert.equal(submitName(q,value==='Jeonbuk'?'North Jeolla':'Jeonbuk').status,'duplicate');
 assert.equal(nameScore(q).unassisted,1);
}
console.log('Jeonbuk / North Jeolla: interchangeable exact naming answers and duplicate detection passed.');
