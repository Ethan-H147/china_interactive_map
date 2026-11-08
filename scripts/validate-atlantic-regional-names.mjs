import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {createNameRound,submitName} from '../dist/name-quiz-engine.mjs';import {quizNamePlace,answerSpecified} from '../dist/quiz-modes.mjs';
const root=new URL('../',import.meta.url),read=file=>{const b=fs.readFileSync(new URL(file,root));return JSON.parse(b[0]===31?gunzipSync(b):b);},hash=x=>createHash('sha256').update(x).digest('hex');
for(const [file,expected]of Object.entries(read('scripts/name-sources/atlantic/geography-baseline.json'))){const data=read(file);assert.equal(data.records.length,expected.count,file+' count unchanged');assert.equal(hash(JSON.stringify(data,(k,v)=>k==='regionalNames'||k==='aliases'?undefined:v)),expected.coreHash,file+' geography and primary names unchanged');}
const allLanguages=new Set();let checked=0;
for(const country of ['united-kingdom','france']){
 const data=read('dist/data/europe/'+country+'/catalogue.bin'),coverage=read('dist/data/europe/'+country+'/regional-names.json');const languages=new Set();
 for(const r of data.records)for(const n of r.regionalNames||[]){assert(n.text&&n.language&&n.source?.startsWith('https://'));assert(r.aliases.includes(n.text));const place=quizNamePlace(r);assert.equal(submitName(createNameRound([place]),n.text).status,'correct',r.id+' '+n.text);const round={questions:[{record:r,feature:{properties:{adcode:r.id}}}],index:0,results:[],complete:false};assert.equal(answerSpecified(round,n.text).status,'correct');languages.add(n.language);allLanguages.add(n.language);checked++;}
 assert.equal(languages.size,country==='france'?12:7);assert.equal(Object.keys(coverage.languages).length,languages.size);
 if(country==='united-kingdom'){const get=id=>data.records.find(r=>r.id===id);assert(get('GB-X-IM').regionalNames.some(n=>n.text==='Ellan Vannin'));assert(!get('GB-R-TLI').regionalNames?.length,'No inherited Welsh/Gaelic translations on London');assert(get('GB-C-E06000052').regionalNames.some(n=>n.text==='Kernow'));}
 else{assert(data.records.find(r=>r.id==='FR-R-53').regionalNames.some(n=>n.text==='Bertègn'));assert(!data.records.find(r=>r.id==='FR-R-11').regionalNames?.length,'No unrelated regional forms on Île-de-France');}
 console.log(country,coverage.records,'administrative cards,',languages.size,'languages');
}
let cityForms=0;
for(const country of ['united-kingdom','france'])for(const r of read('dist/data/quiz/'+country+'-cities.json').records)for(const n of r.regionalNames||[]){const place=quizNamePlace(r);assert.equal(submitName(createNameRound([place]),n.text).status,'correct');const round={questions:[{record:r,feature:{properties:{adcode:r.id}}}],index:0,results:[],complete:false};assert.equal(answerSpecified(round,n.text).status,'correct');cityForms++;}
console.log(cityForms,'regional city-quiz forms also accepted in both typed modes.');
assert.equal(allLanguages.size,19);console.log(checked,'regional forms accepted in both quiz modes; geography and primary names preserved.');
