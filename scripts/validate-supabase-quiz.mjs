import assert from 'node:assert/strict';
import {requestSupabaseQuizRecords,quizRow} from '../dist/quiz-supabase.mjs';
const owner='11111111-1111-4111-8111-111111111111',stream='22222222-2222-4222-8222-222222222222';
const attempt=i=>({id:'33333333-3333-4333-8333-'+String(i).padStart(12,'0'),country:'japan',level:3,mode:'name',scope:'expert',scopeLabel:'Expert',poolHash:'abc',total:83,correct:83,hints:0,reveals:0,elapsedMs:12345,completed:true,fullRound:true,finishedAt:new Date(1700000000000+i*1000).toISOString()});
let requests=[],failReadback=false,offline=false;
const fetcher=async(url,options)=>{
 const endpoint=new URL(url),body=JSON.parse(options.body);requests.push({endpoint,body});assert.equal(options.method,'POST');assert.equal(endpoint.search,'');assert.equal(options.headers.apikey,'public-key');assert.equal(options.headers.Authorization,'Bearer test-session');
 if(offline)throw TypeError('Offline');
 if(endpoint.pathname.endsWith('/quiz_submit_v2')){assert.equal(body.p_stream_id,stream);assert.equal(body.p_sequence,1);assert.equal(body.p_attempts[0].user_id,owner);return Response.json({accepted:failReadback?[]:body.p_attempts.map(a=>a.id)});}
 assert.equal(endpoint.pathname,'/rest/v1/rpc/quiz_snapshot_v2');
 return Response.json({...(body.p_include_summary?{summary:{rounds:1000000,correct:83000000,total:83000000,perfect:1000000,countries:1},bests:[{country:'japan',level:3,mode:'name',scope:'expert',poolHash:'abc',total:83,fullRound:true,bestCorrect:83,fastestMs:12345,rounds:1000000}]}:{}),recent:Array.from({length:25},(_,i)=>quizRow(attempt(1000-i),owner)),nextCursor:JSON.stringify([attempt(976).finishedAt,attempt(976).id]),retentionLimit:1000});
};
const call=patch=>requestSupabaseQuizRecords({url:'https://example.supabase.co/rest/v1/quiz_attempts',key:'public-key',token:'test-session',userId:owner,fetcher,...patch});
const body={streamId:stream,sequence:1,attempts:[attempt(1)]};
assert.deepEqual((await call({method:'POST',body})).accepted,[attempt(1).id]);
requests=[];const data=await call();assert.equal(data.summary.rounds,1000000);assert.equal(data.recent.length,25);assert.equal(data.recent[0].finishedAt,attempt(1000).finishedAt);assert.equal(requests.length,1,'One snapshot request regardless of lifetime rounds');
requests=[];const page=await call({cursor:data.nextCursor});assert.equal(requests.length,1);assert.equal(requests[0].body.p_include_summary,false);assert.equal(requests[0].body.p_before_id,attempt(976).id);assert.equal(page.summary,undefined);
failReadback=true;await assert.rejects(call({method:'POST',body}),/verified/);failReadback=false;offline=true;await assert.rejects(call(),/Offline/);offline=false;
await assert.rejects(call({method:'POST',body:{attempts:[attempt(1)]}}),/sequence/);
await assert.rejects(call({cursor:'["invalid","id"]'}),/cursor/);
await assert.rejects(call({fetcher:async()=>Response.json({message:'wait',code:'QUIZ_RATE_LIMIT'},{status:429,headers:{'Retry-After':'120'}})}),e=>e.status===429&&e.retryAfter===120);
await assert.rejects(call({fetcher:async()=>Response.json({message:'wait',code:'QUIZ_RATE_LIMIT',hint:'180'},{status:429})}),e=>e.retryAfter===180);
await assert.rejects(call({fetcher:async()=>Response.json({code:'PGRST202'},{status:404})}),/database update/);
console.log('Quiz RPC transport: million-round lifetime snapshot uses one bounded request; keyset history, ownership, durable sequence, verified acknowledgement, offline errors, retry timing and missing-migration handling passed.');
