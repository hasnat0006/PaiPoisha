-- 0007_admin: feature suggestions + an admin dashboard that sees only totals (user, 2026-11-16).
-- Server-only, like heartbeat: not in src/db/types.ts, Dexie or COLUMNS. No admin can read any
-- user's entries, wallets, amounts, names or emails: admin_stats() returns counts only.

-- Admins: add a row by hand in the SQL Editor (insert into public.admins select id from auth.users where email = '…').
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security; -- no policies: only the functions below read it

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Daily activity: one row per user per Dhaka day the app synced, plus how many sign-ins that day.
create table public.activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  sign_ins integer not null default 0,
  primary key (user_id, day)
);
alter table public.activity enable row level security; -- no policies: written only by track()

create or replace function public.track(p_sign_in boolean default false) returns void
language sql security definer set search_path = '' as $$
  insert into public.activity (user_id, day, sign_ins)
  select auth.uid(), (now() at time zone 'Asia/Dhaka')::date, case when p_sign_in then 1 else 0 end
  where auth.uid() is not null
  on conflict (user_id, day) do update set sign_ins = public.activity.sign_ins + excluded.sign_ins
$$;
revoke all on function public.track(boolean) from public, anon;
grant execute on function public.track(boolean) to authenticated;

-- Feature suggestions: signed-in users send them (at most 5 a day); only admins read or change them.
create table public.feature_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 100),
  body text not null default '' check (char_length(body) <= 1000),
  status text not null default 'new' check (status in ('new','planned','done','declined')),
  created_at timestamptz not null default now()
);
alter table public.feature_suggestions enable row level security;

create or replace function public.my_suggestions_today() returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.feature_suggestions
  where user_id = auth.uid() and created_at > now() - interval '1 day'
$$;
revoke all on function public.my_suggestions_today() from public, anon;
grant execute on function public.my_suggestions_today() to authenticated;

create policy "send own" on public.feature_suggestions for insert to authenticated
  with check (user_id = auth.uid() and status = 'new' and public.my_suggestions_today() < 5);
create policy "admins read" on public.feature_suggestions for select to authenticated using (public.is_admin());
create policy "admins set status" on public.feature_suggestions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Totals for the dashboard; days = the chart's range (7–90).
create or replace function public.admin_stats(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Dhaka')::date;
  n integer := least(greatest(coalesce(p_days, 30), 7), 90);
  result jsonb;
begin
  if not public.is_admin() then raise exception 'not an admin'; end if;
  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'new_users', (select count(*) from auth.users where (created_at at time zone 'Asia/Dhaka')::date > today - n),
    'active_today', (select count(*) from public.activity where day = today),
    'active_7', (select count(distinct user_id) from public.activity where day > today - 7),
    'active_30', (select count(distinct user_id) from public.activity where day > today - 30),
    'entries', (select count(*) from public.transactions where deleted_at is null),
    'multi_wallet_users', (select count(*) from (select user_id from public.wallets
       where deleted_at is null and not archived group by user_id having count(*) > 1) w),
    'budget_users', (select count(distinct user_id) from public.budgets where deleted_at is null),
    'new_suggestions', (select count(*) from public.feature_suggestions where status = 'new'),
    'daily', (select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'sign_ups', (select count(*) from auth.users u where (u.created_at at time zone 'Asia/Dhaka')::date = d.day),
        'sign_ins', (select coalesce(sum(a.sign_ins), 0) from public.activity a where a.day = d.day),
        'active', (select count(*) from public.activity a where a.day = d.day),
        'entries', (select count(*) from public.transactions t where (t.created_at at time zone 'Asia/Dhaka')::date = d.day)
      ) order by d.day)
      from (select generate_series(today - n + 1, today, interval '1 day')::date as day) d)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_stats(integer) from public, anon;
grant execute on function public.admin_stats(integer) to authenticated;
