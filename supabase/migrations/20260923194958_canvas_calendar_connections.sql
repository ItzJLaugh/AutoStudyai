create table if not exists public.canvas_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  feed_url text not null check (char_length(feed_url) between 1 and 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.canvas_calendar_connections enable row level security;

-- Calendar feed URLs contain an unguessable Canvas token. They are only read
-- by authenticated FastAPI routes after the caller's Supabase token is
-- verified; browser clients never receive the stored URL.
revoke all on table public.canvas_calendar_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.canvas_calendar_connections to service_role;
