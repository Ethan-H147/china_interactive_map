import assert from 'node:assert/strict';
import {requestSupabaseQuizRecords,quizRow} from '../dist/quiz-supabase.mjs';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const attempt=i=>({id:'33333333-3333-4333-8333-'+String(i).padStart(12,'0'),country:'japan',level:3,mode:'name',scope:'expert',scopeLabel:'Expert',poolHash:'abc',total:83,correct:83,hints:0,reveals:0,elapsedMs:12345,completed:true,fullRound:true,finishedAt:new Date(1700000000000+i*1000).toISOString()});
const rows=new Map();let offline=false,failReadback=false;
const fetcher=async(url,options)=>{
 const u=new URL(url);assert.equal(options.headers.apikey,'public-key');assert.equal(options.headers.Authorization,'Bearer test-session');
 if(offline)throw TypeError('Offline');
 const uid=u.searchParams.get('user_id')?.slice(3)||owner;
 if(options.method==='POST'){
  assert.equal(u.searchParams.get('on_conflict'),'user_id,id');assert.equal(options.headers.Prefer,'resolution=ignore-duplicates,return=minimal');
  for(const row of JSON.parse(options.body)){assert.equal(row.user_id,owner);if(!rows.has(row.user_id+row.id))rows.set(row.user_id+row.id,row);}
  return new Response(null,{status:201});
 }
 let data=[...rows.values()].filter(r=>r.user_id===uid).sort((a,b)=>b.finished_at.localeCompare(a.finished_at)||b.id.localeCompare(a.id));
 if(u.searchParams.get('select')==='id'){if(failReadback)return Response.json([]);const ids=u.searchParams.get('id').slice(4,-1).split(',');return Response.json(data.filter(r=>ids.includes(r.id)).map(r=>({id:r.id})));}
 const offset=Number(u.searchParams.get('offset'));return Response.json(data.slice(offset,offset+Math.min(120,Number(u.searchParams.get('limit')))));
};
const call=patch=>requestSupabaseQuizRecords({url:'https://example.supabase.co/rest/v1/quiz_attempts',key:'public-key',token:'test-session',userId:owner,fetcher,...patch});
for(let i=1;i<=40;i+=10){const attempts=Array.from({length:10},(_,j)=>attempt(i+j));assert.equal((await call({method:'POST',body:{attempts}})).accepted.length,10);await call({method:'POST',body:{attempts}});}
let data=await call();assert.equal(rows.size,40);assert.equal(data.summary.rounds,40);assert.equal(data.recent.length,25);assert.equal(data.bests[0].fastestMs,12345);
const page=await call({cursor:data.nextCursor});assert.equal(page.recent.length,15);assert(!page.recent.some(a=>data.recent.some(b=>a.id===b.id)));
assert.equal((await call({userId:other})).summary.rounds,0,'Queries remain scoped to the signed-in owner');
offline=true;await assert.rejects(call(),/Offline/);offline=false;
failReadback=true;await assert.rejects(call({method:'POST',body:{attempts:[attempt(1)]}}),/verified/);failReadback=false;
for(let i=41;i<=1031;i++)rows.set(owner+attempt(i).id,quizRow(attempt(i),owner));
assert.equal((await call()).summary.rounds,1031,'All pages count even with a lower server row limit');
await assert.rejects(call({fetcher:async()=>Response.json({message:'permission denied',code:'42501'},{status:403})}),e=>e.status===403&&e.code==='42501');
console.log('Supabase quiz transport: 40 rounds, idempotent retries, verified readback, account filters, offline errors, pagination beyond 1000 and backend errors passed.');
