import assert from 'node:assert/strict';
import {appearancePaint} from '../dist/appearance-paint.mjs';
import {restoreMapRound,mapRoundDraft} from '../dist/quiz-drafts.mjs';
const original={document:globalThis.document,comfort:globalThis.AtlasComfort};
let dark=false,palette='standard';globalThis.document={documentElement:{get dataset(){return {colorMode:dark?'dark':'light'};}}};globalThis.AtlasComfort={get:()=>({palette})};
try{
 const paint={'fill-color':['case',['boolean',['feature-state','quizCorrect'],false],'#548165','#e9e5dc'],'fill-opacity':['case',['has','name'],1,0]};
 assert.equal(appearancePaint(paint,{role:'fill',type:'fill'}),paint);dark=true;const night=appearancePaint(paint,{role:'fill',type:'fill'});assert.equal(night['fill-color'][2],'#70bf93');assert.deepEqual(night['fill-opacity'],paint['fill-opacity']);assert.deepEqual(paint['fill-color'][2],'#548165','Original semantic paint never mutates');
 assert.equal(appearancePaint({'fill-color':'#ffffff'},{role:'land',type:'fill'},1)['fill-color'],'#ffffff','Satellite land tint is not altered');
 palette='accessible';assert.equal(appearancePaint(paint,{role:'fill',type:'fill'})['fill-color'][2],'#4598d5');
 const pool=['a','b','c'].map(id=>({record:{id},feature:{properties:{adcode:id}}})),round={questions:pool,results:[{expected:'a',chosen:'b',status:'incorrect',typed:'B'}],index:1,complete:false,spellingWarnings:1};const saved=mapRoundDraft(round,12345),restored=restoreMapRound(pool,saved);assert.equal(restored.elapsed,12345);assert.equal(restored.index,1);assert.equal(restored.spellingWarnings,1);assert.deepEqual(restored.results,round.results);assert.equal(restoreMapRound(pool,{...saved,questions:['a','a']}),null);assert.equal(restoreMapRound(pool,{...saved,results:[{expected:'c',chosen:'b',status:'correct'}]}),null);
 console.log('Comfort: reversible semantic paint, satellite preservation, accessible colors, saved quiz order, elapsed time, warning state and malformed-draft rejection passed.');
}finally{globalThis.document=original.document;globalThis.AtlasComfort=original.comfort;}
