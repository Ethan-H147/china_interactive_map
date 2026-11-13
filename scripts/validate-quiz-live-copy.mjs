import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import '../dist/countries.js';
import {quizAttempt} from '../dist/quiz-supabase.mjs';
import {summarizeQuizAttempts} from '../dist/quiz-records-core.mjs';
import {cabinetCatalog,cabinetState} from '../dist/medal-cabinet.mjs';
import {quizTrophies,trophyProgress} from '../dist/quiz-trophies-core.mjs';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const [snapshotPath,reportPath]=process.argv.slice(2);
if(!snapshotPath||!reportPath)throw Error('Supply a read-only live snapshot JSON path and a local report path.');
const bytes=fs.readFileSync(snapshotPath),copy=JSON.parse(bytes);
assert(Array.isArray(copy.account_ids)&&Array.isArray(copy.attempts));
assert.equal(copy.schema.retention_migration_applied,false,'This test expects the pre-migration schema');
assert.equal(copy.schema.rls_enabled,true);assert.equal(copy.schema.authenticated_insert,true);
assert.deepEqual(copy.triggers,[],'Review unexpected production triggers before testing');
const migration=fs.readdirSync('supabase/migrations').find(n=>n.endsWith('_quiz_lifetime_retention.sql'));
const migrationBytes=fs.readFileSync(path.join('supabase/migrations',migration));
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(canonical(value))).digest('hex');
const catalog=cabinetCatalog(globalThis.AtlasCountries.countries);
const sortRows=rows=>[...rows].sort((a,b)=>Date.parse(b.finishedAt)-Date.parse(a.finishedAt)||b.id.localeCompare(a.id));
const bestKeys=['country','level','mode','scope','scopeLabel','poolHash','total','fullRound','bestCorrect','fastestMs','rounds','lastPlayed'];
const canonicalBests=bests=>bests.map(b=>Object.fromEntries(bestKeys.map(k=>[k,k==='lastPlayed'?new Date(b[k]).toISOString():b[k]]))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
function achievements(data){
 const cabinet=cabinetState(catalog,data.bests),medals=cabinet.shelves.map(s=>({country:s.country,slots:s.slots.map(x=>({id:x.id,modes:x.modes,best:x.best,complete:x.complete}))}));
 const trophies=quizTrophies.map(t=>({country:t.country,...trophyProgress(t,data)}));
 const perfectChallenges=canonicalBests(data.bests).filter(b=>b.fullRound&&b.fastestMs!==null).map(({rounds,lastPlayed,scopeLabel,...b})=>b);
 return {medals,points:cabinet.points,tier:cabinet.tier.id,trophies,perfectChallenges};
}
function assertSame(actual,expected,label){if(digest(actual)!==digest(expected))throw Error(label+' differs. See the isolated copy before rollout.');}
const modes=[];
for(const stress of [false,true]){
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  await db.exec(fs.readFileSync('supabase/migrations/202610290001_quiz_attempts.sql','utf8'));
  const constraints=(await db.query("select conname as name,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.quiz_attempts'::regclass order by conname")).rows;
  assertSame(constraints,copy.constraints,'Copied table constraints');
  const indexes=(await db.query("select indexname as name,indexdef as definition from pg_indexes where schemaname='public' and tablename='quiz_attempts' order by indexname")).rows;
  assertSame(indexes,copy.indexes,'Copied indexes');
  const columns=(await db.query("select a.attname as name,format_type(a.atttypid,a.atttypmod) as type,a.attnotnull as not_null,pg_get_expr(d.adbin,d.adrelid) as default from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid='public.quiz_attempts'::regclass and a.attnum>0 and not a.attisdropped order by a.attnum")).rows;
  assertSame(columns,copy.schema.column_definitions,'Copied columns and defaults');
  const policies=(await db.query("select to_jsonb(p) as value from pg_policies p where schemaname='public' and tablename='quiz_attempts' order by policyname")).rows.map(r=>r.value);
  assertSame(policies,copy.policies,'Copied row-security policies');
  for(const id of copy.account_ids)await db.query('insert into auth.users values($1)',[id]);
  await db.query('insert into public.quiz_attempts select * from jsonb_populate_recordset(null::public.quiz_attempts,$1::jsonb)',[JSON.stringify(copy.attempts)]);
  const originals=new Map(copy.account_ids.map(id=>[id,summarizeQuizAttempts(sortRows(copy.attempts.filter(r=>r.user_id===id).map(quizAttempt)))]));
  if(stress){
   const maxTime=Math.max(Date.parse(copy.captured_at),...copy.attempts.map(a=>Date.parse(a.finished_at)));
   for(const id of copy.account_ids){const extra=Array.from({length:1050},(_,i)=>({user_id:id,id:'eeeeeeee-eeee-4eee-8eee-'+String(i+1).padStart(12,'0'),country:'japan',level:1,mode:'find',scope:'local-retention-stress',scope_label:'Local retention test',pool_hash:'stress',total:1,correct:0,hints:0,reveals:0,elapsed_ms:0,completed:false,full_round:false,finished_at:new Date(maxTime+(i+1)*1000).toISOString()}));await db.query('insert into public.quiz_attempts select * from jsonb_populate_recordset(null::public.quiz_attempts,$1::jsonb)',[JSON.stringify(extra)]);}
  }
  const beforeRows=(await db.query('select to_jsonb(a) as value from public.quiz_attempts a order by user_id,finished_at desc,id desc')).rows.map(r=>r.value);
  const before=new Map(copy.account_ids.map(id=>[id,summarizeQuizAttempts(beforeRows.filter(a=>a.user_id===id).map(quizAttempt))]));
  await db.exec(migrationBytes.toString('utf8'));
  const afterRows=(await db.query('select to_jsonb(a) as value from public.quiz_attempts a order by user_id,finished_at desc,id desc')).rows.map(r=>r.value);
  const users=[];
  for(const [index,id]of copy.account_ids.entries()){
   await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');
   const data=(await db.query('select public.quiz_snapshot_v2() as value')).rows[0].value;
   await db.exec('reset role');
   const expected=before.get(id),oldRows=beforeRows.filter(a=>a.user_id===id),newRows=afterRows.filter(a=>a.user_id===id);
   assertSame(data.summary,expected.summary,'Account '+(index+1)+' lifetime totals');
   assertSame(canonicalBests(data.bests),canonicalBests(expected.bests),'Account '+(index+1)+' personal bests');
   assertSame(achievements(data),achievements(expected),'Account '+(index+1)+' medals and collectibles');
   assertSame(newRows,oldRows.slice(0,1000),'Account '+(index+1)+' retained history');
   const original=originals.get(id),originalKeys=new Set(canonicalBests(original.bests).map(b=>JSON.stringify([b.country,b.level,b.mode,b.scope,b.poolHash,b.total,b.fullRound])));
   const originalBests=canonicalBests(data.bests).filter(b=>originalKeys.has(JSON.stringify([b.country,b.level,b.mode,b.scope,b.poolHash,b.total,b.fullRound])));
   assertSame(originalBests,canonicalBests(original.bests),'Account '+(index+1)+' original bests after stress');
   assertSame(achievements({...data,bests:originalBests}),achievements(original),'Account '+(index+1)+' original achievements after stress');
   const awards=achievements(original),medalCount=awards.medals.reduce((n,s)=>n+s.slots.reduce((k,x)=>k+x.modes.filter(Boolean).length,0),0);
   users.push({account:'Account '+(index+1),originalRounds:original.summary.rounds,lifetimeRounds:data.summary.rounds,retainedRounds:newRows.length,trimmedRounds:oldRows.length-newRows.length,personalBestGroups:original.bests.length,earnedMedals:medalCount,earnedCollectibles:awards.trophies.filter(t=>t.earned).length,checks:{totals:true,personalBests:true,medals:true,collectibles:true,history:true},totalsFingerprint:digest(data.summary),personalBestsFingerprint:digest(originalBests),achievementsFingerprint:digest(awards)});
  }
  modes.push({mode:stress?'forced-retention-copy':'unaltered-live-copy',copiedRounds:beforeRows.length,retainedRounds:afterRows.length,accounts:users});
 }finally{await db.close();}
}
const report={passed:true,productionChanges:false,snapshotCapturedAt:copy.captured_at,snapshotSha256:digest(bytes.toString()),migration, migrationSha256:digest(migrationBytes.toString()),liveAccounts:copy.account_ids.length,liveRounds:copy.attempts.length,modes};
fs.mkdirSync(path.dirname(path.resolve(reportPath)),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,accounts:report.liveAccounts,liveRounds:report.liveRounds,tests:modes.map(m=>({mode:m.mode,copiedRounds:m.copiedRounds,retainedRounds:m.retainedRounds,allAccountChecksPassed:m.accounts.every(a=>Object.values(a.checks).every(Boolean))})),report:path.resolve(reportPath)},null,2));
