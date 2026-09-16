create table if not exists public.tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  active_skill text not null default 'explain'
    check (active_skill in ('explain', 'capture', 'build_guide', 'practice', 'retain', 'plan', 'find_material', 'organize')),
  current_goal text not null default '',
  active_class_id uuid,
  active_guide_id uuid,
  conversation_version integer not null default 0,
  status text not null default 'idle' check (status in ('idle', 'running', 'waiting_browser')),
  run_id uuid,
  run_started_at timestamptz,
  messages jsonb not null default '[]'::jsonb,
  browser_available boolean not null default false,
  browser_observation jsonb not null default '{}'::jsonb,
  browser_content text not null default '',
  browser_command jsonb not null default '{}'::jsonb,
  browser_last_seen_at timestamptz,
  permission_scope jsonb not null default '["read_page"]'::jsonb,
  last_action_result jsonb not null default '{}'::jsonb,
  action_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.tutor_sessions enable row level security;

drop policy if exists "Users read own tutor session" on public.tutor_sessions;
create policy "Users read own tutor session"
on public.tutor_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create own tutor session" on public.tutor_sessions;
create policy "Users create own tutor session"
on public.tutor_sessions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own tutor session" on public.tutor_sessions;
create policy "Users update own tutor session"
on public.tutor_sessions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
