import assert from 'node:assert/strict';
import {fixture,login} from './quiz-dashboard.test.mjs';
const id='33333333-3333-4333-8333-333333333333';
async function setup(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const real=fetch;window.quizUndoCalls=0;window.fetch=async(input,init={})=>{if(String(input).endsWith('/rpc/quiz_undo_v2')){window.quizUndoCalls++;const {p_id}=JSON.parse(init.body),data=JSON.parse(localStorage.getItem('quiz-test-cloud')||'{}');for(const key of Object.keys(data))data[key]=data[key].filter(a=>a.id!==p_id);localStorage.setItem('quiz-test-cloud',JSON.stringify(data));return Response.json({removed:true});}return real(input,init);};})()`});
 await p.open(base,'#japan');
 await p.evaluate(`localStorage.setItem('quiz-test-cloud',JSON.stringify({'11111111-1111-4111-8111-111111111111':[{id:'${id}',country:'japan',level:3,mode:'name',scope:'expert',scopeLabel:'Expert',poolHash:'abc',total:83,correct:83,hints:0,reveals:0,elapsedMs:5000,completed:true,fullRound:true,finishedAt:'2026-11-01T00:00:00Z'}]}))`);
 await login(p);await p.tap('[data-account-section=quizzes]');await p.tap('[data-quiz-view=history]');
}
export default [
 {name:'Normal mode hides removal controls and rejects direct removal',options:{width:1280,height:900},async run(p,base){
  await setup(p,base);
  assert.equal(await p.evaluate('document.querySelectorAll(".quiz-history-row").length'),1);
  assert.equal(await p.evaluate('document.querySelectorAll(".quiz-history-actions").length'),0);
  assert.equal(await p.evaluate(`AtlasQuizRecords.quizRecords.canRemove('${id}')`),false);
  assert.match(await p.evaluate(`AtlasQuizRecords.quizRecords.remove('${id}').then(()=>'',e=>e.message)`),/developer mode/);
  assert.equal(await p.evaluate('quizUndoCalls'),0);assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds'),1);
 }},
 {name:'Developer mode preserves confirmation and recalculates the removed result',options:{width:1280,height:900,developer:true},async run(p,base){
  await setup(p,base);await p.tap('[data-remove-round]');await p.tap('.quiz-history-actions button:last-child');
  assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds'),1);assert.equal(await p.evaluate('quizUndoCalls'),0);
  await p.tap('[data-remove-round]');await p.tap('[data-confirm-remove]');await p.waitFor('AtlasQuizRecords.quizRecords.data.summary.rounds===0');
  assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.bests.length'),0);assert.equal(await p.evaluate('document.querySelectorAll(".quiz-history-row").length'),0);assert.equal(await p.evaluate('quizUndoCalls'),1);
 }},
 {name:'Exiting developer mode clears confirmation and cancels a queued removal',options:{width:1280,height:900,developer:true},async run(p,base){
  await setup(p,base);await p.tap('[data-remove-round]');
  await p.evaluate(`window.quizUndoLockHeld=false;void navigator.locks.request('boundary-atlas-quiz-sync:11111111-1111-4111-8111-111111111111',()=>{window.quizUndoLockHeld=true;return new Promise(resolve=>window.releaseQuizUndoLock=resolve);})`);
  await p.waitFor('quizUndoLockHeld');await p.evaluate(`window.queuedQuizUndo=AtlasQuizRecords.quizRecords.remove('${id}');document.querySelector('.developer-exit').click()`);
  await p.waitFor('!AtlasDev.enabled&&!document.querySelector("[data-confirm-remove]")&&!document.querySelector(".quiz-history-actions")');
  await p.evaluate('releaseQuizUndoLock();queuedQuizUndo');
  assert.equal(await p.evaluate('quizUndoCalls'),0);assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds'),1);assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.status'),'synced');
  assert.equal(await p.evaluate(`AtlasQuizRecords.quizRecords.canRemove('${id}')`),false);
 }}
];
