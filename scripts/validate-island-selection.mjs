import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {polygonParts} from '../dist/polygon-parts.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {selectionLineData} from '../dist/outline-detail.mjs';
const fc=features=>({type:'FeatureCollection',features}),read=f=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/canada/'+f)));
const code=fs.readFileSync('dist/country-boundary-worker.mjs','utf8').replace(/^import .*;\r?\n/gm,'');
async function prepare(payload){let result;const worker=vm.createContext({Blob,TextEncoder,polygonParts,lineData,selectionLineData,loadCompressed:async()=>payload,self:{postMessage:data=>result=data}});vm.runInContext(code,worker);await worker.self.onmessage({data:{url:'test',deferOutlines:true}});assert(!result.error);return result;}
async function selection(payload,id){const ranges=payload.outlineIndex[id],pieces=['{"type":"FeatureCollection","features":['];ranges.forEach((range,i)=>{if(i)pieces.push(',');pieces.push(payload.outlineData.slice(...range));});pieces.push(']}');return JSON.parse(await new Blob(pieces).text());}
const first=read('first.bin'),national=await prepare(first),original=polygonParts(first.regions);
for(const id of ['CA-NU','CA-NT']){
 const expected=fc(original.features.filter(f=>f.properties.id===id));assert(expected.features.length>700);assert.equal(national.outlineIndex[id].length,1,'One page-side slice per territory regardless of island count');
 assert.deepEqual(await selection(national,id),expected,'Every original polygon, hole, coordinate and ownership field survives grouping');console.log(id+': '+expected.features.length+' original polygon parts selected with one byte slice.');
}
for(const file of ['second/CA-NU.bin','second/CA-NT.bin']){
 const data=read(file),payload=await prepare(data),all=polygonParts(data.regions);
 for(const id of new Set(all.features.map(f=>f.properties.id))){assert.equal(payload.outlineIndex[id].length,1);assert.deepEqual(await selection(payload,id),fc(all.features.filter(f=>f.properties.id===id)));}
}
const square=x=>[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]],feature=(id,x)=>({type:'Feature',properties:{id,name:'Îles · 🏝️'},geometry:{type:'Polygon',coordinates:[square(x)]}}),features=[feature('A',0),feature('A',2),feature('B',4),feature('A',6)];
const mixed=await prepare({regions:fc(features),boundaries:fc([])});assert.equal(mixed.outlineIndex.A.length,2,'Nonadjacent repeated IDs keep distinct byte spans');assert.deepEqual(await selection(mixed,'A'),fc(features.filter(f=>f.properties.id==='A')),'Coalescing never includes intervening owners and UTF-8 byte positions remain exact');
console.log('Island selection: no geometry simplification, national/division coverage, exact UTF-8 slices, adjacent grouping and interleaved IDs passed.');
