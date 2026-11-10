-- Local migration: backfill lifetime records before trimming detailed history.
begin;
lock table public.quiz_attempts in access exclusive mode;
create schema if not exists atlas_private;
revoke all on schema atlas_private from public, anon;
grant usage on schema atlas_private to authenticated;

create table atlas_private.quiz_totals (
 user_id uuid primary key references auth.users(id) on delete cascade,
 rounds bigint not null default 0, correct bigint not null default 0,
 total bigint not null default 0, perfect bigint not null default 0,
 minute_start timestamptz, minute_count integer not null default 0,
 day_start timestamptz, day_count integer not null default 0
);
create table atlas_private.quiz_bests (
 user_id uuid not null references auth.users(id) on delete cascade,
 country text not null, level integer not null, mode text not null,
 scope text not null, scope_label text not null, pool_hash text not null,
 total integer not null, full_round boolean not null,
 best_correct integer not null, fastest_ms bigint, rounds bigint not null,
 last_played timestamptz not null,
 primary key(user_id,country,level,mode,scope,pool_hash,total,full_round)
);
-- A bounded cursor per browser stream replaces a growing receipt per new round.
create table atlas_private.quiz_upload_streams (
 user_id uuid not null references auth.users(id) on delete cascade,
 stream_id uuid not null, sequence bigint not null, payload_hash text not null,
 primary key(user_id,stream_id)
);
-- Only pre-upgrade IDs: old browser backups can safely replay after trimming.
-- New rounds never add rows here. No old scores or history are kept in this table.
create table atlas_private.quiz_legacy_ids (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null, primary key(user_id,id)
);
alter table atlas_private.quiz_totals enable row level security;
alter table atlas_private.quiz_bests enable row level security;
alter table atlas_private.quiz_upload_streams enable row level security;
alter table atlas_private.quiz_legacy_ids enable row level security;
revoke all on all tables in schema atlas_private from public, anon, authenticated;

insert into atlas_private.quiz_totals(user_id,rounds,correct,total,perfect)
select user_id,count(*),sum(correct),sum(total),
 count(*) filter(where completed and correct=total and hints=0 and reveals=0 and elapsed_ms>0)
from public.quiz_attempts group by user_id;
insert into atlas_private.quiz_bests
select user_id,country,level,mode,scope,max(scope_label),pool_hash,total,full_round,
 max(correct),min(elapsed_ms) filter(where completed and correct=total and hints=0 and reveals=0 and elapsed_ms>0),count(*),max(finished_at)
from public.quiz_attempts group by user_id,country,level,mode,scope,pool_hash,total,full_round;
insert into atlas_private.quiz_legacy_ids select user_id,id from public.quiz_attempts;
-- Preserve contributions of trimmed details so undo can fall back to older bests.
create table atlas_private.quiz_archived_bests (like atlas_private.quiz_bests including all);
alter table atlas_private.quiz_archived_bests add foreign key(user_id) references auth.users(id) on delete cascade;
alter table atlas_private.quiz_archived_bests enable row level security;
revoke all on atlas_private.quiz_archived_bests from public,anon,authenticated;
create table atlas_private.quiz_removed_ids(user_id uuid references auth.users(id) on delete cascade,id uuid,removed_at timestamptz not null default clock_timestamp(),primary key(user_id,id));
alter table atlas_private.quiz_removed_ids enable row level security;
revoke all on atlas_private.quiz_removed_ids from public,anon,authenticated;
create function atlas_private.archive_quiz_detail() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if current_setting('atlas.quiz_undo_id',true)=old.id::text or not exists(select 1 from auth.users where id=old.user_id) then return old;end if;
 insert into atlas_private.quiz_archived_bests values(old.user_id,old.country,old.level,old.mode,old.scope,old.scope_label,old.pool_hash,old.total,old.full_round,old.correct,case when old.completed and old.correct=old.total and old.hints=0 and old.reveals=0 and old.elapsed_ms>0 then old.elapsed_ms end,1,old.finished_at)
 on conflict(user_id,country,level,mode,scope,pool_hash,total,full_round) do update set best_correct=greatest(quiz_archived_bests.best_correct,excluded.best_correct),fastest_ms=least(quiz_archived_bests.fastest_ms,excluded.fastest_ms),rounds=quiz_archived_bests.rounds+1,last_played=greatest(quiz_archived_bests.last_played,excluded.last_played),scope_label=case when excluded.last_played>=quiz_archived_bests.last_played then excluded.scope_label else quiz_archived_bests.scope_label end;
 return old;
end $$;
revoke all on function atlas_private.archive_quiz_detail() from public,anon,authenticated;
create trigger archive_quiz_detail before delete on public.quiz_attempts for each row execute function atlas_private.archive_quiz_detail();

delete from public.quiz_attempts a using (
 select user_id,id,row_number() over(partition by user_id order by finished_at desc,id desc) as position
 from public.quiz_attempts
) old where a.user_id=old.user_id and a.id=old.id and old.position>1000;

-- Old direct-insert clients cannot bypass retention, aggregation or rate limits.
revoke insert on public.quiz_attempts from authenticated;
drop policy quiz_attempts_insert_own on public.quiz_attempts;

create function atlas_private.quiz_submit_v2(p_stream_id uuid,p_sequence bigint,p_attempts jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); previous atlas_private.quiz_upload_streams%rowtype;
 a public.quiz_attempts%rowtype; item jsonb; ids jsonb:='[]'::jsonb;
 digest text; inserted integer; fresh integer:=0; good boolean;
 now_at timestamptz:=statement_timestamp(); minute_at timestamptz; day_at timestamptz; wait_seconds integer;
begin
 if uid is null then raise insufficient_privilege using message='Sign in to save quiz results'; end if;
 if p_stream_id is null or p_sequence is null or p_sequence<1 or p_sequence>9007199254740991
 or jsonb_typeof(p_attempts) is distinct from 'array' then raise invalid_parameter_value using message='Invalid quiz upload'; end if;
 if jsonb_array_length(p_attempts) not between 1 and 10 or octet_length(p_attempts::text)>65536
 then raise invalid_parameter_value using message='Supply up to ten compact quiz results'; end if;
 -- Serialize writes for this owner, including different devices and concurrent tabs.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 digest:=md5(p_attempts::text);
 select * into previous from atlas_private.quiz_upload_streams where user_id=uid and stream_id=p_stream_id;
 if found and p_sequence<previous.sequence then
  raise invalid_parameter_value using message='Quiz upload state is outdated. Keep your saved rounds and recover this device before retrying.';
 end if;
 if previous.stream_id is not null and p_sequence=previous.sequence then
  if p_sequence=previous.sequence and digest<>previous.payload_hash then
   raise invalid_parameter_value using message='Upload sequence was reused with different results';
  end if;
  return jsonb_build_object('accepted',(select jsonb_agg(value->>'id') from jsonb_array_elements(p_attempts)));
 end if;
 if p_sequence<>coalesce(previous.sequence,0)+1 then raise invalid_parameter_value using message='Quiz upload sequence is out of order'; end if;
 if previous.stream_id is null and (select count(*) from atlas_private.quiz_upload_streams where user_id=uid)>=128 then
  raise program_limit_exceeded using message='Too many quiz upload devices for this account';
 end if;
 minute_at:=date_trunc('minute',now_at);day_at:=date_trunc('day',now_at at time zone 'UTC') at time zone 'UTC';
 insert into atlas_private.quiz_totals(user_id) values(uid) on conflict do nothing;
 for item in select value from jsonb_array_elements(p_attempts) loop
  if jsonb_typeof(item) is distinct from 'object' then raise invalid_parameter_value using message='Invalid quiz result'; end if;
  a:=jsonb_populate_record(null::public.quiz_attempts,item);
  if a.user_id is distinct from uid then raise insufficient_privilege using message='Quiz result belongs to another account'; end if;
  if a.id is null or a.country is null or a.country !~ '^[a-z][a-z0-9-]{0,79}$'
   or a.level is null or a.level not between 1 and 3 or a.mode is null or a.mode not in ('find','name','identify')
   or a.scope is null or length(a.scope)>160 or a.scope_label is null or length(a.scope_label)>200
   or a.pool_hash is null or length(a.pool_hash) not between 1 and 80
   or a.total is null or a.total not between 1 and 100000 or a.correct is null or a.correct not between 0 and a.total
   or a.hints is null or a.hints not between 0 and 100000 or a.reveals is null or a.reveals not between 0 and 100000
   or a.elapsed_ms is null or a.elapsed_ms not between 0 and 31536000000
   or a.completed is null or a.full_round is null or a.finished_at is null or not isfinite(a.finished_at)
   or a.finished_at>now_at+interval '5 minutes'
  then raise invalid_parameter_value using message='Invalid quiz result fields'; end if;
  if ids ? a.id::text then raise invalid_parameter_value using message='Duplicate round in upload'; end if;
  ids:=ids||jsonb_build_array(a.id::text);
  if exists(select 1 from atlas_private.quiz_legacy_ids where user_id=uid and id=a.id) or exists(select 1 from atlas_private.quiz_removed_ids where user_id=uid and id=a.id) then continue; end if;
  insert into public.quiz_attempts select (a).* on conflict(user_id,id) do nothing;
  get diagnostics inserted=row_count;
  if inserted=0 then continue; end if;
  fresh:=fresh+1;
  good:=a.completed and a.correct=a.total and a.hints=0 and a.reveals=0 and a.elapsed_ms>0;
  update atlas_private.quiz_totals set rounds=rounds+1,correct=correct+a.correct,total=total+a.total,perfect=perfect+good::integer where user_id=uid;
  insert into atlas_private.quiz_bests values(uid,a.country,a.level,a.mode,a.scope,a.scope_label,a.pool_hash,a.total,a.full_round,a.correct,case when good then a.elapsed_ms end,1,a.finished_at)
  on conflict(user_id,country,level,mode,scope,pool_hash,total,full_round) do update set
   best_correct=greatest(quiz_bests.best_correct,excluded.best_correct),
   fastest_ms=least(quiz_bests.fastest_ms,excluded.fastest_ms),
   rounds=quiz_bests.rounds+1,last_played=greatest(quiz_bests.last_played,excluded.last_played),
   scope_label=case when excluded.last_played>=quiz_bests.last_played then excluded.scope_label else quiz_bests.scope_label end;
 end loop;
 update atlas_private.quiz_totals set
  minute_count=case when minute_start=minute_at then minute_count else 0 end+fresh,minute_start=minute_at,
  day_count=case when day_start=day_at then day_count else 0 end+fresh,day_start=day_at
 where user_id=uid;
 if exists(select 1 from atlas_private.quiz_totals where user_id=uid and (minute_count>120 or day_count>2000)) then
  select greatest(1,ceil(extract(epoch from (case when day_count>2000 then day_at+interval '1 day' else minute_at+interval '1 minute' end)-now_at))::integer) into wait_seconds from atlas_private.quiz_totals where user_id=uid;
  raise sqlstate 'PGRST' using message=jsonb_build_object('code','QUIZ_RATE_LIMIT','message','Quiz upload limit reached. Saved rounds will retry later.','details',null,'hint',wait_seconds::text)::text,
   detail=jsonb_build_object('status',429,'headers',jsonb_build_object('Retry-After',wait_seconds::text))::text;
 end if;
 insert into atlas_private.quiz_upload_streams values(uid,p_stream_id,p_sequence,digest)
 on conflict(user_id,stream_id) do update set sequence=excluded.sequence,payload_hash=excluded.payload_hash;
 delete from public.quiz_attempts where user_id=uid and id in (
  select id from public.quiz_attempts where user_id=uid order by finished_at desc,id desc offset 1000
 );
 return jsonb_build_object('accepted',ids);
end $$;

create function atlas_private.quiz_snapshot_v2(p_before_at timestamptz default null,p_before_id uuid default null,p_include_summary boolean default true)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); page jsonb; result jsonb; last_row jsonb; has_more boolean;
begin
 if uid is null then raise insufficient_privilege using message='Sign in to read quiz results'; end if;
 if (p_before_at is null)<>(p_before_id is null) then raise invalid_parameter_value using message='Invalid history cursor'; end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.finished_at desc,r.id desc),'[]'::jsonb) into page from (
  select * from public.quiz_attempts where user_id=uid and (p_before_at is null or (finished_at,id)<(p_before_at,p_before_id))
  order by finished_at desc,id desc limit 26
 )r;
 has_more:=jsonb_array_length(page)>25;page:=page-25;last_row:=page->(jsonb_array_length(page)-1);
 result:=jsonb_build_object('recent',page,'nextCursor',case when has_more then jsonb_build_array(last_row->>'finished_at',last_row->>'id')::text end,'retentionLimit',1000);
 if p_include_summary then
  result:=result||jsonb_build_object('summary',coalesce((select jsonb_build_object('rounds',rounds,'correct',correct,'total',total,'perfect',perfect,'countries',(select count(distinct country) from atlas_private.quiz_bests where user_id=uid)) from atlas_private.quiz_totals where user_id=uid),'{"rounds":0,"correct":0,"total":0,"perfect":0,"countries":0}'::jsonb),
   'bests',coalesce((select jsonb_agg(jsonb_build_object('country',country,'level',level,'mode',mode,'scope',scope,'scopeLabel',scope_label,'poolHash',pool_hash,'total',total,'fullRound',full_round,'bestCorrect',best_correct,'fastestMs',fastest_ms,'rounds',rounds,'lastPlayed',last_played)) from atlas_private.quiz_bests where user_id=uid),'[]'::jsonb));
 end if;
 return result;
end $$;

-- Public entry points are invokers; privileged implementations are not in an exposed schema.
create function public.quiz_submit_v2(p_stream_id uuid,p_sequence bigint,p_attempts jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select atlas_private.quiz_submit_v2(p_stream_id,p_sequence,p_attempts) $$;
create function public.quiz_snapshot_v2(p_before_at timestamptz default null,p_before_id uuid default null,p_include_summary boolean default true)
returns jsonb language sql stable security invoker set search_path='' as $$ select atlas_private.quiz_snapshot_v2(p_before_at,p_before_id,p_include_summary) $$;
revoke all on function public.quiz_submit_v2(uuid,bigint,jsonb),public.quiz_snapshot_v2(timestamptz,uuid,boolean),atlas_private.quiz_submit_v2(uuid,bigint,jsonb),atlas_private.quiz_snapshot_v2(timestamptz,uuid,boolean) from public,anon;
grant execute on function public.quiz_submit_v2(uuid,bigint,jsonb),public.quiz_snapshot_v2(timestamptz,uuid,boolean),atlas_private.quiz_submit_v2(uuid,bigint,jsonb),atlas_private.quiz_snapshot_v2(timestamptz,uuid,boolean) to authenticated;
create function atlas_private.quiz_undo_v2(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.quiz_attempts%rowtype;
begin
 if uid is null then raise insufficient_privilege using message='Sign in to remove a round';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into a from public.quiz_attempts where user_id=uid and id=p_id;
 if not found then return jsonb_build_object('removed',false);end if;
 perform set_config('atlas.quiz_undo_id',a.id::text,true);
 delete from public.quiz_attempts where user_id=uid and id=p_id;
 perform set_config('atlas.quiz_undo_id','',true);
 update atlas_private.quiz_totals set rounds=rounds-1,correct=correct-a.correct,total=total-a.total,perfect=perfect-(a.completed and a.correct=a.total and a.hints=0 and a.reveals=0 and a.elapsed_ms>0)::integer where user_id=uid;
 delete from atlas_private.quiz_bests where user_id=uid and (country,level,mode,scope,pool_hash,total,full_round)=(a.country,a.level,a.mode,a.scope,a.pool_hash,a.total,a.full_round);
 insert into atlas_private.quiz_bests
 select uid,a.country,a.level,a.mode,a.scope,(array_agg(b.scope_label order by b.last_played desc))[1],a.pool_hash,a.total,a.full_round,max(b.best_correct),min(b.fastest_ms),sum(b.rounds),max(b.last_played) from (
  select scope_label,best_correct,fastest_ms,rounds,last_played from atlas_private.quiz_archived_bests where user_id=uid and (country,level,mode,scope,pool_hash,total,full_round)=(a.country,a.level,a.mode,a.scope,a.pool_hash,a.total,a.full_round)
  union all
  select scope_label,correct,case when completed and correct=total and hints=0 and reveals=0 and elapsed_ms>0 then elapsed_ms end,1,finished_at from public.quiz_attempts where user_id=uid and (country,level,mode,scope,pool_hash,total,full_round)=(a.country,a.level,a.mode,a.scope,a.pool_hash,a.total,a.full_round)
 ) b having count(*)>0;
 insert into atlas_private.quiz_removed_ids(user_id,id) values(uid,p_id) on conflict do nothing;
 delete from atlas_private.quiz_removed_ids where user_id=uid and id in (select id from atlas_private.quiz_removed_ids where user_id=uid order by removed_at desc,id desc offset 1000);
 return jsonb_build_object('removed',true);
end $$;
create function public.quiz_undo_v2(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select atlas_private.quiz_undo_v2(p_id)$$;
revoke all on function atlas_private.quiz_undo_v2(uuid),public.quiz_undo_v2(uuid) from public,anon;
grant execute on function atlas_private.quiz_undo_v2(uuid),public.quiz_undo_v2(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
