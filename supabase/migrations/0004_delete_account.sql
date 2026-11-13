-- 0004_delete_account: "Delete my account and data" (spec §11 Privacy).
-- Deleting the auth user removes every row: all tables (and shortcut_keys) reference
-- auth.users(id) on delete cascade. The app can't delete auth users itself, hence security definer.

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Supabase grants execute on new public functions to anon and authenticated by default; narrow that.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
