import assert from 'node:assert/strict';
import {fixture,login} from './quiz-dashboard.test.mjs';
const owner='11111111-1111-4111-8111-111111111111';
export default [{name:'Bounded history, lifetime records and lost upload replies survive reload',options:{width:1280,height:900},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#japan');
 await p.evaluate(`(()=>{const all=Array.from({length:1005},(_,i)=>({id:'33333333-3333-4333-8333-'+String(i).padStart(12,'0'),country:'japan',level:3,mode:'name',scope:'expert',scopeLabel:'Expert',poolHash:'abc',total:83,correct:i===0?83:40,hints:0,reveals:0,elapsedMs:i===0?5000:100000,completed:true,fullRound:true,finishedAt:new Date(1700000000000+i*1000).toISOString()}));localStorage.setItem('quiz-test-cloud',JSON.stringify({'${owner}':all}));})()`);
 await login(p);assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds'),1005);assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.recent.length'),25);assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.bests[0].fastestMs'),5000);
 await p.evaluate('AtlasQuizRecords.quizRecords.more()');assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.recent.length'),50);assert.equal(await p.evaluate(`quizApiCalls.filter(c=>c.method==='GET').length`),2);
 await p.evaluate(`(()=>{window.quizApiDropAfterCommit=true;const t=AtlasQuizRecords.quizRecords.begin({country:'japan',level:3,mode:'name',scope:'expert',scopeLabel:'Expert',poolHash:'abc',total:83,fullRound:true});t.finish({correct:83,hints:0,reveals:0,completed:true,elapsedMs:4000});})()`);
 await p.waitFor(`AtlasQuizRecords.quizRecords.status==='offline'`);assert.equal(await p.evaluate(`JSON.parse(localStorage.getItem('quiz-test-cloud'))['${owner}'].length`),1006);
 await p.send('Page.reload');await p.settle();await p.tap('#account-open');await p.waitFor(`AtlasQuizRecords.quizRecords.status==='synced'`);
 assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds'),1006);assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.bests[0].fastestMs'),4000);assert.equal(await p.evaluate(`JSON.parse(localStorage.getItem('quiz-test-cloud'))['${owner}'].length`),1006,'Lost reply retries do not add another result');
 assert.equal(await p.evaluate(`Object.keys(localStorage).filter(k=>k.startsWith('boundary-atlas-quiz-pending-v1:${owner}:')).length`),0);await p.tap('[data-account-section=quizzes]');await p.tap('[data-quiz-view=history]');await p.screenshot('quiz-retention-lifetime-history');
 }},{name:'Submission limit keeps queued results and suppresses premature retries',options:{width:390,height:844,mobile:true},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#japan');await login(p);
 await p.evaluate(`(()=>{window.quizApiRateLimited=true;const t=AtlasQuizRecords.quizRecords.begin({country:'japan',level:1,mode:'name',scope:'',scopeLabel:'',poolHash:'abc',total:47,fullRound:true});t.finish({correct:47,hints:0,reveals:0,completed:true,elapsedMs:60000});})()`);
 await p.waitFor(`AtlasQuizRecords.quizRecords.status==='offline'`);assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds'),1);
 const count=await p.evaluate(`quizApiCalls.filter(c=>c.method==='POST').length`);
 await p.evaluate(`(async()=>{dispatchEvent(new Event('online'));dispatchEvent(new Event('focus'));await AtlasQuizRecords.quizRecords.retry();})()`);
 assert.equal(await p.evaluate(`quizApiCalls.filter(c=>c.method==='POST').length`),count,'Focus and online events respect Retry-After');
 assert.equal(await p.evaluate(`Object.keys(localStorage).filter(k=>k.startsWith('boundary-atlas-quiz-pending-v1:${owner}:')).length`),1,'Rate-limited result remains durably queued');
 }}];
