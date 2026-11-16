-- 0008: Supabase advisor fixes + anonymous crash reports for the admin dashboard (user, 2026-11-16).

-- 1. set_updated_at: fixed search_path (advisor 0011). now() is in pg_catalog, always found.
alter function public.set_updated_at() set search_path = '';

-- 2. RLS: evaluate auth.uid() once per query, not once per row (advisor 0003).
do $$
declare t text;
begin
  foreach t in array array['settings','wallets','categories','transactions','budgets'] loop
    execute format('alter policy "own rows" on public.%I
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
alter policy "send own" on public.feature_suggestions
  with check (user_id = (select auth.uid()) and status = 'new' and public.my_suggestions_today() < 5);

-- 3. Indexes for foreign keys (advisor 0001): deletes of wallets/categories/users stay fast.
create index if not exists budgets_category_id on public.budgets (category_id);
create index if not exists transactions_category_id on public.transactions (category_id);
create index if not exists transactions_wallet_id on public.transactions (wallet_id);
create index if not exists transactions_to_wallet_id on public.transactions (to_wallet_id);
create index if not exists feature_suggestions_user_id on public.feature_suggestions (user_id);

-- 4. Crash reports: no user id, no entry data; only the error text, the page path and the browser.
-- Server-only, like heartbeat: not in src/db/types.ts, Dexie or COLUMNS.
create table public.client_errors (
  id bigint generated always as identity primary key,
  message text not null,
  page text not null default '',
  browser text not null default '',
  created_at timestamptz not null default now()
);
create index client_errors_created on public.client_errors (created_at);
alter table public.client_errors enable row level security; -- no policies: report_error() writes, admin_errors() reads

-- Anyone may report (crashes happen before sign-in too). Text is cut short, and a flood is dropped:
-- at most 500 reports an hour in all, and old ones are removed after 30 days.
create or replace function public.report_error(p_message text, p_page text, p_browser text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.client_errors where created_at > now() - interval '1 hour') >= 500 then return; end if;
  insert into public.client_errors (message, page, browser)
  values (left(coalesce(p_message, ''), 500), left(coalesce(p_page, ''), 100), left(coalesce(p_browser, ''), 200));
  delete from public.client_errors where created_at < now() - interval '30 days';
end $$;
revoke all on function public.report_error(text, text, text) from public;
grant execute on function public.report_error(text, text, text) to anon, authenticated;

-- The dashboard's list: the same error grouped, newest first, last 30 days.
create or replace function public.admin_errors()
returns table (message text, page text, times bigint, last_seen timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not an admin'; end if;
  return query
    select e.message, max(e.page), count(*), max(e.created_at)
    from public.client_errors e
    where e.created_at > now() - interval '30 days'
    group by e.message
    order by max(e.created_at) desc
    limit 100;
end $$;
revoke all on function public.admin_errors() from public, anon;
grant execute on function public.admin_errors() to authenticated;
