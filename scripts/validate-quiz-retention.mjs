import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {highestMedal} from '../dist/quiz-medals.mjs';
import {quizTrophies,trophyProgress} from '../dist/quiz-trophies-core.mjs';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite(),owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',stream='33333333-3333-4333-8333-333333333333';
const uuid=i=>'44444444-4444-4444-8444-'+String(i).padStart(12,'0');
const scalar=async sql=>(await db.query(sql)).rows[0].value;
const attempt=(i,patch={})=>({user_id:owner,id:uuid(i),country:'japan',level:3,mode:'name',scope:'expert',scope_label:'Expert',pool_hash:'abc',total:83,correct:40,hints:0,reveals:0,elapsed_ms:100000,completed:true,full_round:true,finished_at:new Date(1700000000000+i*1000).toISOString(),...patch});
const submit=(sequence,attempts,streamId=stream)=>db.query('select public.quiz_submit_v2($1,$2,$3::jsonb) as value',[streamId,sequence,JSON.stringify(attempts)]);
const snapshot=async args=>(await db.query('select public.quiz_snapshot_v2($1,$2,$3) as value',args||[null,null,true])).rows[0].value;
const setOwner=async id=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);};
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${owner}'),('${other}');`);
 await db.exec(fs.readFileSync('supabase/migrations/202610290001_quiz_attempts.sql','utf8'));
 // The only perfect expert round is older than the entire retained history.
 for(let i=1;i<=1005;i++)await db.query('insert into public.quiz_attempts select (jsonb_populate_record(null::public.quiz_attempts,$1::jsonb)).*',[JSON.stringify(attempt(i,i===1?{correct:83,elapsed_ms:5000}:i<=4?{country:'china',level:1,mode:['name','find','identify'][i-2],scope:'',scope_label:'',correct:83,elapsed_ms:5000}:i<=30?{finished_at:attempt(6).finished_at}:{}))]);
 const migration=fs.readdirSync('supabase/migrations').find(n=>n.endsWith('_quiz_lifetime_retention.sql'));assert(migration);
 await db.exec(fs.readFileSync(path.join('supabase/migrations',migration),'utf8'));
 await setOwner(owner);await db.exec('set role authenticated');
 let data=await snapshot();assert.equal(data.summary.rounds,1005);assert.equal(data.summary.perfect,4);assert.equal(data.summary.correct,1001*40+4*83);assert.equal(data.summary.countries,2);assert(trophyProgress(quizTrophies.find(t=>t.country==='china'),data).earned,'An old three-mode collectible survives history trimming');assert.equal(data.recent.length,25);assert(!data.recent.some(a=>a.id===uuid(1)));
 assert.equal(data.bests.find(b=>b.country==='japan').fastestMs,5000);assert.equal(highestMedal(data.bests,'japan',3,[{id:'expert',medal:'Diamond'}],'name')?.medal,'Diamond');
 const ids=[];let pages=0;for(;;){ids.push(...data.recent.map(a=>a.id));pages++;if(!data.nextCursor)break;const [at,id]=JSON.parse(data.nextCursor);data=await snapshot([at,id,false]);assert(!data.summary);}
 assert.equal(ids.length,1000);assert.equal(new Set(ids).size,1000);assert.equal(pages,40);assert.equal(ids.at(-1),uuid(6));
 // Upload old offline data: it counts toward lifetime even if immediately trimmed.
 await submit(1,[attempt(2000,{finished_at:'2000-01-01T00:00:00Z',correct:83,elapsed_ms:4000})]);
 data=await snapshot();assert.equal(data.summary.rounds,1006);assert.equal(data.bests.find(b=>b.country==='japan').fastestMs,4000);assert(!data.recent.some(a=>a.id===uuid(2000)));
 await submit(1,[attempt(2000,{finished_at:'2000-01-01T00:00:00Z',correct:83,elapsed_ms:4000})]);assert.equal((await snapshot()).summary.rounds,1006,'Retry after trimming is idempotent');
 await submit(2,[attempt(1,{correct:83,elapsed_ms:5000})]);assert.equal((await snapshot()).summary.rounds,1006,'Pre-migration backup IDs do not count twice');
 await assert.rejects(submit(2,[attempt(2001)]),/different results/);await assert.rejects(submit(4,[attempt(2001)]),/out of order/);
 await assert.rejects(submit(3,[attempt(2001,{user_id:other})]),/another account/);
 await assert.rejects(submit(3,[attempt(2001),attempt(2002,{correct:1000})]),/Invalid quiz/);assert.equal((await snapshot()).summary.rounds,1006,'Malformed batch rolls back entirely');
 await assert.rejects(db.query('insert into public.quiz_attempts select (jsonb_populate_record(null::public.quiz_attempts,$1::jsonb)).*',[JSON.stringify(attempt(2001))]),/permission denied/);
 await assert.rejects(db.query('select * from atlas_private.quiz_totals'),/permission denied/);
 await setOwner(other);assert.equal((await snapshot()).summary.rounds,0);await assert.rejects(submit(1,[attempt(2001)]),/another account/);
 await setOwner(null);await assert.rejects(snapshot(),/Sign in/);await db.exec('reset role;set role anon');await assert.rejects(snapshot(),/permission denied/);await db.exec('reset role;set role authenticated');await setOwner(owner);
 // A new owner/stream cannot reuse someone else's authenticated identity.
 for(let seq=3;seq<=13;seq++)await submit(seq,Array.from({length:10},(_,j)=>attempt(3000+seq*10+j)));
 await submit(14,Array.from({length:9},(_,j)=>attempt(4000+j)));
 const before=(await snapshot()).summary.rounds;await assert.rejects(submit(15,[attempt(5000)]),/QUIZ_RATE_LIMIT/);assert.equal((await snapshot()).summary.rounds,before,'Rate limit rolls back totals, stream and detail insert');
 await db.exec('reset role');assert.equal(Number(await scalar(`select count(*) as value from public.quiz_attempts where user_id='${owner}'`)),1000);
 assert.equal(Number(await scalar(`select count(*) as value from atlas_private.quiz_upload_streams where user_id='${owner}'`)),1,'No per-round receipt growth');
 assert.equal(Number(await scalar('select count(*) as value from atlas_private.quiz_legacy_ids')),1005,'Legacy dedup set never grows for new rounds');
 await db.exec(`update atlas_private.quiz_totals set minute_count=0,day_count=2000 where user_id='${owner}'`);await db.exec('set role authenticated');await assert.rejects(submit(15,[attempt(5000)]),/QUIZ_RATE_LIMIT/);
 await db.exec('reset role');await db.exec(`update atlas_private.quiz_totals set minute_count=0,day_count=0 where user_id='${owner}'`);await db.exec('set role authenticated');await submit(15,[attempt(5000)]);
 assert.equal((await snapshot()).bests.find(b=>b.country==='japan').fastestMs,4000);
 // Old batches remain harmless after the stream has advanced.
 await assert.rejects(submit(1,[attempt(2000)]),/outdated/);assert.equal((await snapshot()).summary.rounds,before+1);
 await db.exec('reset role');await db.exec(`insert into atlas_private.quiz_upload_streams select '${owner}',('55555555-5555-4555-8555-'||lpad(i::text,12,'0'))::uuid,1,'seed' from generate_series(1,127)i`);await db.exec('set role authenticated');await assert.rejects(submit(1,[attempt(5001)],'66666666-6666-4666-8666-666666666666'),/Too many quiz upload devices/);
 console.log('Local PostgreSQL: 1,005-round backfill, 1,000 retention, 40 keyset pages, lifetime totals, old medal/best preservation, old offline results, replay safety, atomic validation, rate limits, direct-write denial and account isolation passed.');
}finally{await db.close();}
