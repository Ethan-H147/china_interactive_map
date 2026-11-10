import assert from 'node:assert/strict';import fs from 'node:fs';
import {highestMedal} from '../dist/quiz-medals.mjs';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',id=i=>'33333333-3333-4333-8333-'+String(i).padStart(12,'0');
const row=(i,patch={})=>({user_id:owner,id:id(i),country:'japan',level:3,mode:'name',scope:'easy',scope_label:'Easy',pool_hash:'abc',total:10,correct:5,hints:0,reveals:0,elapsed_ms:10000,completed:true,full_round:true,finished_at:new Date(1700000000000+i*1000).toISOString(),...patch});
const snapshot=async()=>(await db.query('select public.quiz_snapshot_v2() as v')).rows[0].v;
const undo=async value=>(await db.query('select public.quiz_undo_v2($1) as v',[value])).rows[0].v;
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${owner}'),('${other}');`);
 await db.exec(fs.readFileSync('supabase/migrations/202610290001_quiz_attempts.sql','utf8'));
 const rows=Array.from({length:1005},(_,i)=>row(i+1,i===0?{correct:10,elapsed_ms:5000}:i===1004?{correct:10,elapsed_ms:2000}:{}));rows.push(row(2000,{user_id:other,correct:10}));await db.query('insert into public.quiz_attempts select * from jsonb_populate_recordset(null::public.quiz_attempts,$1::jsonb)',[JSON.stringify(rows)]);
 await db.exec(fs.readFileSync('supabase/migrations/20261110183131_quiz_lifetime_retention.sql','utf8'));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await db.exec('set role authenticated');assert.equal((await undo(id(1005))).removed,false,'Cannot remove another user’s round');
 assert.equal((await undo(id(2000))).removed,true);let s=await snapshot();assert.equal(s.summary.rounds,0);assert.equal(s.summary.countries,0);assert.equal(s.bests.length,0,'Only qualifying result removal revokes its medal');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);assert.equal((await snapshot()).bests[0].fastestMs,2000);assert.equal((await undo(id(1005))).removed,true);s=await snapshot();assert.equal(s.summary.rounds,1004);assert.equal(s.summary.perfect,1);assert.equal(s.bests[0].fastestMs,5000,'Falls back to archived perfect time');assert(highestMedal(s.bests,'japan',3,[{id:'easy',medal:'Bronze'}],'name'));
 assert.equal((await undo(id(1005))).removed,false);assert.equal((await snapshot()).summary.rounds,1004,'Retries do not subtract twice');
 const fresh=row(3000,{correct:10,elapsed_ms:1000,finished_at:new Date().toISOString()}),stream='44444444-4444-4444-8444-444444444444';await db.query('select public.quiz_submit_v2($1,1,$2::jsonb)',[stream,JSON.stringify([fresh])]);await undo(fresh.id);await db.query('select public.quiz_submit_v2($1,2,$2::jsonb)',[stream,JSON.stringify([fresh])]);assert.equal((await snapshot()).summary.rounds,1004,'Recently removed rounds cannot be uploaded again');assert.equal((await snapshot()).bests[0].fastestMs,5000);
 await assert.rejects(db.query('delete from public.quiz_attempts where user_id=$1',[owner]),/permission denied/);
 await db.exec('reset role');assert.equal(Number((await db.query('select sum(rounds) as n from atlas_private.quiz_archived_bests where user_id=$1',[owner])).rows[0].n),5,'Undo does not archive the deleted result');
 await db.query('delete from auth.users where id=$1',[owner]);assert.equal(Number((await db.query('select count(*) as n from public.quiz_attempts where user_id=$1',[owner])).rows[0].n),0,'Account deletion still cascades cleanly');
 console.log('Round undo: ownership, totals, last qualifying medal removal, fallback to trimmed personal best, idempotency, resubmission guard and direct-delete denial passed.');
}finally{await db.close();}
