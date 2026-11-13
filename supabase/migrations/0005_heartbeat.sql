-- 0005_heartbeat: keeps the free Supabase project from pausing (user, 2026-11-13).
-- cron-job.org calls heartbeat() daily over PostgREST with the public anon key; each call is a
-- real database write. Server-only, like shortcut_keys: not in src/db/types.ts, Dexie or COLUMNS.

create table public.heartbeat (
  id smallint primary key default 1 check (id = 1), -- exactly one row
  beat_at timestamptz not null default now()
);
-- RLS on with no policies: clients can't read or write it; only heartbeat() below can.
alter table public.heartbeat enable row level security;

-- Anyone may call it: the worst they can do is move one timestamp. Returns the new time.
create or replace function public.heartbeat() returns timestamptz
language sql security definer set search_path = '' as $$
  insert into public.heartbeat (id, beat_at) values (1, now())
  on conflict (id) do update set beat_at = excluded.beat_at
  returning beat_at
$$;

revoke all on function public.heartbeat() from public;
grant execute on function public.heartbeat() to anon, authenticated;
