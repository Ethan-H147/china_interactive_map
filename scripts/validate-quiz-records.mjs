import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleQuizRequest,validateQuizAttempt} from '../hosting/quiz-api.mjs';
import {createQuizTimer,quizPoolHash,quizChallengeKey,summarizeQuizAttempts,mergeQuizSnapshot} from '../dist/quiz-records-core.mjs';
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('hosting/drizzle').filter(f=>f.endsWith('.sql')))sql.exec(fs.readFileSync('hosting/drizzle/'+f,'utf8'));
const DB={prepare(query){return{bind(...values){return{query,values};}};},async batch(statements){return statements.map(({query,values})=>/^SELECT/i.test(query)?{results:sql.prepare(query).all(...values)}:(sql.prepare(query).run(...values),{results:[]}));}};
const nativeFetch=globalThis.fetch;let authCalls=0,authOffline=false;
globalThis.fetch=async(url,options)=>{assert.equal(url,'https://odenagmobrswlzkljayf.supabase.co/auth/v1/user');authCalls++;if(authOffline)throw Error('Offline');const token=options.headers.Authorization;if(token==='Bearer expired')return new Response('{}',{status:401});return Response.json({id:token==='Bearer account-b'?'B':'A'});};
const call=async(method='GET',token='account-a',body,query='',origin='https://ethan-h147.github.io')=>handleQuizRequest(new Request('https://china-boundary-atlas.hys0423.chatgpt.site/api/quiz-records'+query,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{DB});
let sequence=0;const attempt=patch=>({id:'00000000-0000-4000-8000-'+String(++sequence).padStart(12,'0'),country:'china',level:1,mode:'name',scope:'',scopeLabel:'',poolHash:quizPoolHash(['a','b']),total:2,correct:2,hints:0,reveals:0,elapsedMs:10000,completed:true,fullRound:true,finishedAt:new Date().toISOString(),...patch});
try{
 assert.equal((await call('GET',null)).status,401);assert.equal(authCalls,0);
 assert.equal((await call('GET','account-a',null,'','https://untrusted.example')).status,403);assert.equal(authCalls,0);
 assert.equal((await call('OPTIONS',null)).status,204);assert.equal(authCalls,0);
 const cloudflareOrigin='https://china-interactive-map.huyusheng777.workers.dev';
 const preflight=await call('OPTIONS',null,null,'',cloudflareOrigin);assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),cloudflareOrigin);assert.equal(authCalls,0,'Preflight never reads user records');
 assert.equal((await call('GET','account-a',null,'',cloudflareOrigin+'.untrusted.example')).status,403,'Only the exact deployment origin is trusted');
 assert.equal(await handleQuizRequest(new Request('https://atlas.example/app.js'),{DB}),null);
 const first=attempt({user_id:'B'});assert.equal((await call('POST','account-a',{attempts:[first]})).status,201);assert.equal((await call('POST','account-a',{attempts:[first]})).status,201);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM quiz_attempts').get().n,1,'Retries cannot duplicate a round');assert.equal(sql.prepare('SELECT user_id FROM quiz_attempts').get().user_id,'A','Ownership comes only from verified Auth');
 await call('POST','account-b',{attempts:[attempt({country:'japan',total:47,correct:46})]});let a=await(await call()).json(),b=await(await call('GET','account-b')).json();assert.equal(a.summary.rounds,1);assert.equal(b.summary.rounds,1);assert.equal(a.recent[0].country,'china');assert.equal(b.recent[0].country,'japan');
 await call('POST','account-a',{attempts:[attempt({elapsedMs:3000,hints:1}),attempt({elapsedMs:2000,reveals:1}),attempt({elapsedMs:1000,total:1,correct:1,fullRound:false}),attempt({elapsedMs:9000})]});
 a=await(await call()).json();assert.equal(a.summary.rounds,5);assert.equal(a.bests.find(b=>b.fullRound).fastestMs,9000,'Hints/reveals cannot beat a clean full-round record');assert.equal(a.bests.find(b=>!b.fullRound).fastestMs,1000,'Short rounds stay in their own challenge');
 const old=sql.prepare('SELECT COUNT(*) AS n FROM quiz_attempts').get().n;assert.equal((await call('POST','account-a',{attempts:[attempt(),attempt({correct:900})]})).status,400);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM quiz_attempts').get().n,old,'Invalid batches write nothing');
 assert.equal((await call('POST','expired',{attempts:[attempt()]})).status,401);authOffline=true;assert.equal((await call()).status,503);authOffline=false;
 assert.equal((await call('GET','account-a',null,'?cursor=invalid')).status,400);assert.equal((await call('POST','account-a',{attempts:[attempt({scope:"x' OR 1=1"})]})).status,400);
 assert.throws(()=>validateQuizAttempt(attempt({elapsedMs:-1})));assert.throws(()=>validateQuizAttempt(attempt({mode:'bad'})));
 for(let i=0;i<27;i++)await call('POST','account-a',{attempts:[attempt({finishedAt:new Date(Date.now()-i*1000).toISOString()})]});a=await(await call()).json();assert.equal(a.recent.length,25);assert(a.nextCursor);const page=await(await call('GET','account-a',null,'?cursor='+encodeURIComponent(a.nextCursor))).json();assert(page.recent.length);assert(!page.recent.some(r=>a.recent.some(old=>old.id===r.id)),'History pagination has no duplicate rows');
 // City quizzes use level 3. One queued city result must not reject an entire
 // batch of otherwise valid province/county records.
 const city=attempt({country:'brazil',level:3,scope:'master',scopeLabel:'Master',total:140,correct:140}),province=attempt({country:'brazil',level:1,total:27,correct:27});
 const roundsBefore=a.summary.rounds,mixed={attempts:[city,province]};
 assert.equal((await call('POST','account-a',mixed,'',cloudflareOrigin)).status,201);
 assert.equal((await call('POST','account-a',mixed)).status,201,'Retry city batches idempotently');
 const restoredResponse=await call('GET','account-a',null,'',cloudflareOrigin);assert.equal(restoredResponse.headers.get('Access-Control-Allow-Origin'),cloudflareOrigin);const restored=await restoredResponse.json();assert.equal(restored.summary.rounds,roundsBefore+2);
 const cityBest=restored.bests.find(b=>b.country==='brazil'&&b.level===3&&b.scope==='master');assert.equal(cityBest.bestCorrect,140);assert.equal(cityBest.fastestMs,10000);assert.equal(cityBest.rounds,1);
 assert(restored.bests.some(b=>b.country==='brazil'&&b.level===1),'Province and city challenges remain separate');
 assert(!(await(await call('GET','account-b')).json()).recent.some(a=>a.id===city.id),'A second device must still authenticate as the owning account');
 for(const level of [0,4,3.5])assert.equal((await call('POST','account-a',{attempts:[attempt({level})]})).status,400,'Reject unsupported quiz levels');
 let now=100;const timer=createQuizTimer(()=>now,500);timer.start();now+=1200;assert.equal(timer.elapsed,1700);timer.stop();now+=1000;assert.equal(timer.elapsed,1700);timer.start();now+=300;assert.equal(timer.stop(),2000);
 assert.equal(quizPoolHash(['b','a']),quizPoolHash(['a','b']));assert.notEqual(quizChallengeKey(first),quizChallengeKey({...first,mode:'find'}));assert.notEqual(quizChallengeKey(first),quizChallengeKey({...first,level:2}));
 const local=attempt(),summary=summarizeQuizAttempts([local]);const merged=mergeQuizSnapshot({recent:[local],...summary},[local]);assert.equal(merged.summary.rounds,1,'Queued acknowledgements are not counted twice');
 console.log('Quiz records: account isolation, verified-token ownership, idempotent offline retries, clean/short/hinted record separation, validation, history pagination and monotonic timers passed.');
}finally{globalThis.fetch=nativeFetch;sql.close();}
