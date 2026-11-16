-- Limits so no one can fill the free database (500 MB; when full it turns read-only and sync stops for everyone).
-- Far above real use: on 2026-11-16 the largest account had 3 entries, 5 wallets and 20 categories.

-- 1. Per-account limits, checked once per upload batch (statement trigger), so sync stays fast.
--    Total rows per table (deleted rows count: they still take space) and new rows per day across all tables.
--    Going over refuses the whole batch: the phone keeps its data and shows "Couldn't sync".
create table public.upload_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  rows integer not null default 0,
  primary key (user_id, day)
);
alter table public.upload_usage enable row level security; -- no policies: written only by enforce_row_limits()
-- Server-only, like heartbeat: not in src/db/types.ts, Dexie or COLUMNS.

create or replace function public.enforce_row_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cap integer := case tg_table_name
    when 'transactions' then 50000 when 'wallets' then 50 when 'categories' then 200
    when 'budgets' then 5000 else 50 end; -- settings
  today date := (now() at time zone 'Asia/Dhaka')::date;
  r record;
  over boolean;
begin
  for r in select user_id, count(*)::integer as n from new_rows group by user_id loop
    insert into public.upload_usage (user_id, day, rows) values (r.user_id, today, r.n)
    on conflict (user_id, day) do update set rows = public.upload_usage.rows + excluded.rows;
    if (select u.rows from public.upload_usage u where u.user_id = r.user_id and u.day = today) > 5000 then
      raise exception 'daily upload limit reached' using errcode = '54000';
    end if;
    execute format('select count(*) > %s from public.%I where user_id = $1', cap, tg_table_name) into over using r.user_id;
    if over then raise exception '% limit reached (%)', tg_table_name, cap using errcode = '54000'; end if;
  end loop;
  delete from public.upload_usage where day < today - 7;
  return null;
end $$;
revoke all on function public.enforce_row_limits() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['settings','wallets','categories','transactions','budgets'] loop
    execute format('create trigger %I_row_limits after insert on public.%I referencing new table as new_rows
                    for each statement execute function public.enforce_row_limits()', t, t);
  end loop;
end $$;

-- 2. Crash reports: anyone may send them, so bound the table itself. A repeat of the same error within an hour adds to
--    its count instead of a row; at most 100 new rows an hour and 5,000 in all (about 4 MB at the worst).
alter table public.client_errors add column times integer not null default 1;

create or replace function public.report_error(p_message text, p_page text, p_browser text) returns void
language plpgsql security definer set search_path = '' as $$
declare msg text := left(coalesce(p_message, ''), 500);
begin
  update public.client_errors set times = times + 1, created_at = now()
  where id = (select e.id from public.client_errors e
              where e.message = msg and e.created_at > now() - interval '1 hour' order by e.created_at desc limit 1);
  if found then return; end if;
  if (select count(*) from public.client_errors where created_at > now() - interval '1 hour') >= 100 then return; end if;
  if (select count(*) from public.client_errors) >= 5000 then return; end if;
  insert into public.client_errors (message, page, browser)
  values (msg, left(coalesce(p_page, ''), 100), left(coalesce(p_browser, ''), 200));
  delete from public.client_errors where created_at < now() - interval '30 days';
end $$;

create or replace function public.admin_errors()
returns table (message text, page text, times bigint, last_seen timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not an admin'; end if;
  return query
    select e.message, max(e.page), sum(e.times)::bigint, max(e.created_at)
    from public.client_errors e
    where e.created_at > now() - interval '30 days'
    group by e.message
    order by max(e.created_at) desc
    limit 100;
end $$;

-- 3. The dashboard shows the database size (db_bytes), so growth is seen long before the 500 MB limit.
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
    'db_bytes', pg_database_size(current_database()),
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
