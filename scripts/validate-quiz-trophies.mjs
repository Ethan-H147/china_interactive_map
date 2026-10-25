import assert from 'node:assert/strict';import fs from 'node:fs';
import {quizTrophies,trophyProgress} from '../dist/quiz-trophies-core.mjs';import {parseTrophyGlb} from '../dist/trophy-viewer.mjs';
const best=(t,changes={})=>({country:t.country,level:1,scope:'',mode:'name',total:t.minimum,bestCorrect:t.minimum,fullRound:true,fastestMs:50000,...changes});
assert.equal(quizTrophies.length,4);assert.equal(new Set(quizTrophies.map(t=>t.country)).size,4);
for(const trophy of quizTrophies){
 assert(!trophyProgress(trophy,{bests:[]}).earned);assert(trophyProgress(trophy,{bests:[best(trophy)]}).earned);assert(trophyProgress(trophy,{bests:[best(trophy,{mode:'find'})]}).earned);assert(trophyProgress(trophy,{bests:[best(trophy,{mode:'identify'})]}).earned);
 for(const change of [{level:2},{fullRound:false},{scope:'US-DE'},{total:5,bestCorrect:5},{fastestMs:null},{fastestMs:0},{country:'other'}])assert(!trophyProgress(trophy,{bests:[best(trophy,change)]}).earned,JSON.stringify(change));
 const progress=trophyProgress(trophy,{bests:[best(trophy,{bestCorrect:Math.floor(trophy.minimum/2),fastestMs:null})]});assert(progress.percent<100&&progress.percent>0);
 const raw=fs.readFileSync('dist/'+trophy.file),data=parseTrophyGlb(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));let triangles=0;for(const part of data){assert.equal(part.positions.length,part.normals.length);assert(part.positions.every(Number.isFinite));assert(part.normals.every(Number.isFinite));for(let i=0;i<part.normals.length;i+=3)assert(Math.abs(Math.hypot(...part.normals.subarray(i,i+3))-1)<.0001);assert(part.color.every(c=>c>=0&&c<=1));triangles+=part.positions.length/9;}assert(triangles>1000&&triangles<15000);assert(raw.length<1000000);assert(fs.existsSync('dist/'+trophy.poster));
}
const t=quizTrophies[0],a={bests:[best(t)]},b={bests:[]};assert(trophyProgress(t,a).earned);assert(!trophyProgress(t,b).earned);assert(trophyProgress(t,{bests:[best(t,{fastestMs:40000}),best(t,{fastestMs:9000})]}).fastestMs===9000);
console.log('Trophies: four real glTF meshes, finite geometry and unit normals, bounded model sizes, qualifying full-round records, hinted/short/deeper/scope exclusions, mode support and account snapshot isolation passed.');
