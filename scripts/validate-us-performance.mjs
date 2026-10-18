import {createPlaceSearch} from '../dist/place-search.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {polygonParts} from '../dist/polygon-parts.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {selectionLineData} from '../dist/outline-detail.mjs';
import {loadAtlasData} from '../dist/atlas-data.mjs';
const fc=features=>({type:'FeatureCollection',features}),square=(x,y)=>[[x,y],[x+1,y],[x+1,y+1],[x,y+1],[x,y]];
const regions=fc([
 {type:'Feature',properties:{id:'islands',name:'Îles'},geometry:{type:'MultiPolygon',coordinates:[[square(1,1)],[square(3,1)]]}},
 {type:'Feature',properties:{id:'islands',name:'Îles'},geometry:{type:'Polygon',coordinates:[square(5,1)]}},
 {type:'Feature',properties:{id:'other'},geometry:{type:'Polygon',coordinates:[square(7,1)]}}
]),part={regions,boundaries:fc([{type:'Feature',properties:{owners:['islands','other']},geometry:{type:'LineString',coordinates:[[7,1],[7,2]]}}])},pending=new Map(),messages=[];
const context=vm.createContext({Blob,TextEncoder,JSON,console,polygonParts,lineData,selectionLineData,loadCompressed:url=>new Promise(resolve=>pending.set(url,resolve)),self:{postMessage:message=>messages.push(message)}});
vm.runInContext(fs.readFileSync('dist/country-boundary-worker.mjs','utf8').replace(/^import .*;\r?\n/gm,''),context);
const task=context.self.onmessage({data:{urls:['counties','municipalities'],deferOutlines:true}});
assert.deepEqual([...pending.keys()],['counties','municipalities'],'Independent layers begin loading together');
pending.get('counties')(part);pending.get('municipalities')(part);await task;
assert.equal(messages.length,1);assert.equal(messages[0].chunks.length,2);
for(const chunk of messages[0].chunks){
 assert.equal(chunk.outlineData,chunk.blob,'The selected outline reuses the polygon blob');
 assert.deepEqual(JSON.parse(await chunk.blob.text()),polygonParts(regions));
 assert.deepEqual(JSON.parse(await chunk.borders.text()),lineData(part.boundaries));
 assert.deepEqual(JSON.parse(await chunk.outlines.text()),fc([]),'No duplicate nationwide or statewide outline source is indexed');
 const pieces=['{"type":"FeatureCollection","features":['];
 chunk.outlineIndex.islands.forEach((range,i)=>{if(i)pieces.push(',');pieces.push(chunk.outlineData.slice(...range));});pieces.push(']}');
 assert.equal(chunk.outlineIndex.islands.length,1,'Adjacent island parts share one byte range without losing any part');
 const url=URL.createObjectURL(new Blob(pieces,{type:'application/json'}));
 try{assert.deepEqual(await loadAtlasData('atlas-data://selection?url='+encodeURIComponent(url)+'&transform=selection-outline'),selectionLineData(fc(polygonParts(regions).features.filter(f=>f.properties.id==='islands'))),'Worker-side selected lines preserve precise geometry, winding, metadata and UTF-8 offsets');}finally{URL.revokeObjectURL(url);}
}
context.loadCompressed=async()=>part;await context.self.onmessage({data:{url:'legacy'}});
assert.deepEqual(JSON.parse(await messages.at(-1).outlines.text()),selectionLineData(regions),'Existing adapters retain their full-outline path');
context.loadCompressed=async()=>{throw Error('Boundary unavailable');};await context.self.onmessage({data:{urls:['a','b'],deferOutlines:true}});assert.equal(messages.at(-1).error,'Boundary unavailable');
console.log('US performance: parallel demand loading, shared polygon/selection blob, exact selected-only outlines, duplicate islands, UTF-8 byte offsets, legacy compatibility and failed-batch handling passed.');

const searchRecords=Array.from({length:100},(_,i)=>({id:String(i),en:'Town '+String(i).padStart(3,'0'),level:3}));
searchRecords.push({id:'accent',en:'Café',local:'Café',level:3},{id:'zip',en:'ZIP 00601',aliases:['00601'],level:2});
const search=createPlaceSearch(searchRecords);
assert.equal(search('Town').length,20);
assert.equal(search('Town 099')[0].id,'99','Refinement can reveal a result outside the original top twenty');
assert.equal(search('Town 009')[0].id,'9','Replacing a query restarts from the full index');
assert.equal(search('Town 00').length,10,'Backspace expands the candidate set');
assert.equal(search('Town 0').length,20);
assert.equal(search('  CAFE  ')[0].id,'accent','Normalization preserves case and accent matching');
assert.equal(search('006')[0].id,'zip');assert.equal(search('00601')[0].id,'zip');
assert.deepEqual(search(''),[]);assert.equal(search('Town 099')[0].id,'99','Clearing the input resets refinement');
console.log('Incremental search: full candidate retention, ranking, replacement, backspace, accents, leading-zero ZIPs and reset passed.');

const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').trim().toLowerCase().replace(/\s+/g,' ');
const many=Array.from({length:6000},(_,i)=>({id:String(i),en:['North','South','East','West','Café'][i%5]+' '+String(i%300),level:i%4,aliases:['Code '+String(i%900),'County '+(i%40)]}));
const compare=(a,b)=>Number(b.id)-Number(a.id);
const reference=query=>{const q=normalize(query);return many.map(record=>({record,names:[record.en,...record.aliases].map(normalize)})).filter(e=>e.names.some(n=>n.includes(q))).map(e=>({...e,rank:e.names.includes(q)?0:e.names.some(n=>n.startsWith(q))?1:2})).sort((a,b)=>a.rank-b.rank||Number(a.record.level===0)-Number(b.record.level===0)||a.record.level-b.record.level||compare(a.record,b.record)||a.record.en.localeCompare(b.record.en)).slice(0,20).map(r=>r.record.id);};
const bounded=createPlaceSearch(many,{compare});
for(const query of ['n','no','north','north 1','north 12','north 1','cafe','a','code','code 8','code 89','county 1','west','west 10','south','0','1','code 899'])assert.deepEqual(bounded(query).map(r=>r.id),reference(query),'Bounded ranking exactly matches full sorting: '+query);
console.log('Bounded search ranking: exact and prefix matches, hierarchy, custom comparison, stable ties and replacement match full sorting.');
