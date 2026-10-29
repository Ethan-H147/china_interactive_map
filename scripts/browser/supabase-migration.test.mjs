import assert from 'node:assert/strict';
import {fixture,login} from './quiz-dashboard.test.mjs';
const owner='11111111-1111-4111-8111-111111111111';
export default [{name:'Supabase migration preserves 40 cached and pending rounds, retries, and restores a clean device',options:{width:1280,height:900},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#japan');
 await p.evaluate(`(async()=>{
  const records=Array.from({length:40},(_,i)=>({id:'33333333-3333-4333-8333-'+String(i).padStart(12,'0'),country:'japan',level:3,mode:['name','find','identify'][i%3],scope:'easy',scopeLabel:'Easy',poolHash:'abc',total:10,correct:10,hints:0,reveals:0,elapsedMs:10000,completed:true,fullRound:true,finishedAt:new Date(1700000000000+i*1000).toISOString()}));
  const {summarizeQuizAttempts}=await import('/quiz-records-core.mjs');
  localStorage.setItem('boundary-atlas-quiz-records-v1:${owner}',JSON.stringify({...summarizeQuizAttempts(records),recent:records.slice(0,25),nextCursor:null}));
  for(const a of records.slice(20))localStorage.setItem('boundary-atlas-quiz-pending-v1:${owner}:'+a.id,JSON.stringify(a));
 })()`);
 await login(p);await p.waitFor('AtlasQuizRecords.quizRecords.status==="synced"');
 assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds'),40);
 assert.equal(await p.evaluate(`JSON.parse(localStorage.getItem('quiz-test-cloud'))['${owner}'].length`),40);
 assert.deepEqual(await p.evaluate(`(()=>{const b=JSON.parse(localStorage.getItem('boundary-atlas-quiz-migration-backup-v1:${owner}'));return [b.snapshot.recent.length,b.pending.length]})()`),[25,20]);
 await p.evaluate('AtlasQuizRecords.quizRecords.retry()');assert.equal(await p.evaluate(`JSON.parse(localStorage.getItem('quiz-test-cloud'))['${owner}'].length`),40);
 await p.evaluate(`for(const k of Object.keys(localStorage))if(k.startsWith('boundary-atlas-quiz-'))localStorage.removeItem(k)`);
 await p.send('Page.reload');await p.settle();await p.tap('#account-open');await p.waitFor('AtlasQuizRecords.quizRecords.status==="synced"');
 assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds'),40);
 await p.evaluate('AtlasQuizRecords.quizRecords.more()');assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.recent.length'),40);
}}];
