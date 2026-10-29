-- Run in the existing Supabase project's SQL Editor.
-- This creates a new table. It does not migrate browser or D1 records.
begin;

create table public.quiz_attempts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id uuid not null,
  country text not null,
  level integer not null check (level between 1 and 3),
  mode text not null check (mode in ('find', 'name', 'identify')),
  scope text not null default '',
  scope_label text not null default '',
  pool_hash text not null,
  total integer not null check (total > 0),
  correct integer not null check (correct between 0 and total),
  hints integer not null check (hints >= 0),
  reveals integer not null check (reveals >= 0),
  elapsed_ms bigint not null check (elapsed_ms >= 0),
  completed boolean not null,
  full_round boolean not null,
  finished_at timestamptz not null,
  primary key (user_id, id)
);

create index quiz_attempts_user_history
  on public.quiz_attempts (user_id, finished_at desc, id desc);
create index quiz_attempts_user_challenge
  on public.quiz_attempts (user_id, country, level, mode);

alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from anon, authenticated;
grant select, insert on public.quiz_attempts to authenticated;

create policy quiz_attempts_read_own
  on public.quiz_attempts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy quiz_attempts_insert_own
  on public.quiz_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Results are append-only. Retries must use ON CONFLICT DO NOTHING,
-- retaining the original (user_id, id), rather than overwriting results.
commit;
