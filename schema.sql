-- Выполните в Supabase → SQL Editor. Безопасность обеспечивается RLS.
create table if not exists public.workout_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  week smallint not null check (week between 1 and 12),
  day smallint not null check (day between 1 and 3),
  performed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed boolean not null default false,
  mood text not null default '',
  notes text not null default '',
  sets jsonb not null default '{}'::jsonb,
  constraint notes_length check (char_length(notes) <= 4000),
  constraint mood_allowed check (mood in ('', 'easy', 'normal', 'hard'))
);
create index if not exists workout_sessions_user_updated on public.workout_sessions(user_id, updated_at desc);
alter table public.workout_sessions enable row level security;

-- Очищаем политики при повторном запуске скрипта
DROP POLICY IF EXISTS "sessions_select_own" ON public.workout_sessions;
DROP POLICY IF EXISTS "sessions_insert_own" ON public.workout_sessions;
DROP POLICY IF EXISTS "sessions_update_own" ON public.workout_sessions;
DROP POLICY IF EXISTS "sessions_delete_own" ON public.workout_sessions;

create policy "sessions_select_own" on public.workout_sessions
for select to authenticated using ((select auth.uid()) = user_id);
create policy "sessions_insert_own" on public.workout_sessions
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sessions_update_own" on public.workout_sessions
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sessions_delete_own" on public.workout_sessions
for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.workout_sessions from anon;
grant select, insert, update, delete on public.workout_sessions to authenticated;
