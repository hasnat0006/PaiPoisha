-- 0003_shortcut: the iOS Shortcut saves an expense without opening the app (user, 2026-11-09).
-- The Shortcut calls shortcut_list / shortcut_add over PostgREST with the public anon key plus
-- the user's personal key. Only the key's SHA-256 is stored. This table is server-only: it is
-- never synced to the phone, so it is not in src/db/types.ts or Dexie (see decisions.md).

create table public.shortcut_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  key_hash text not null unique,
  created_at timestamptz not null default now()
);
-- RLS on with no policies: clients can't touch it; only the security-definer functions below can.
alter table public.shortcut_keys enable row level security;

-- Signed-in user: make a new key (replacing the old one) and return it. Shown once in the app.
create or replace function public.shortcut_new_key() returns text
language plpgsql security definer set search_path = '' as $$
declare k text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.shortcut_keys (user_id, key_hash)
  values (auth.uid(), encode(sha256(convert_to(k, 'UTF8')), 'hex'))
  on conflict (user_id) do update set key_hash = excluded.key_hash, created_at = now();
  return k;
end $$;

-- Internal: key -> user, language, digits and the last-used wallet (wallet of the newest expense,
-- else the first active wallet). Not callable by clients.
create or replace function public.shortcut_ctx(p_key text, out uid uuid, out lang text, out bn_digits boolean,
  out wallet_id uuid, out wallet_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  select k.user_id into uid from public.shortcut_keys k
  where k.key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex');
  if uid is null then return; end if;
  select s.language, s.bangla_digits into lang, bn_digits from public.settings s
  where s.user_id = uid and s.deleted_at is null order by s.updated_at desc limit 1;
  lang := coalesce(lang, 'bn');
  bn_digits := coalesce(bn_digits, lang = 'bn');
  select w.id, w.name into wallet_id, wallet_name from public.wallets w
  left join lateral (
    select max(t.created_at) as used from public.transactions t
    where t.wallet_id = w.id and t.type = 'expense' and t.deleted_at is null
  ) u on true
  where w.user_id = uid and w.deleted_at is null and not w.archived
  order by u.used desc nulls last, w.sort_order, w.created_at limit 1;
end $$;

-- Internal: category display name in the user's language (mirrors categoryName in src/lib/entries.ts).
create or replace function public.shortcut_cat_name(c public.categories, lang text) returns text
language sql immutable set search_path = '' as $$
  select case when lang = 'bn' then coalesce(c.name_bn, c.name_en) else coalesce(c.name_en, c.name_bn) end
$$;

-- Internal: paisa -> "৳1,23,456.50" with lakh grouping, Bangla digits if wanted (mirrors formatMoney).
create or replace function public.shortcut_money(p bigint, bn_digits boolean) returns text
language sql immutable set search_path = '' as $$
  select '৳' || case when bn_digits then translate(s, '0123456789', '০১২৩৪৫৬৭৮৯') else s end
  from (select
    case when length(i) <= 3 then i
         else regexp_replace(left(i, -3), '(\d)(?=(\d\d)+$)', '\1,', 'g') || ',' || right(i, 3) end
    || case when p % 100 = 0 then '' else '.' || lpad((p % 100)::text, 2, '0') end as s
    from (select (p / 100)::text as i) a) b
$$;

-- Shortcut step 1: the pop-up texts, expense categories and the wallet that will be used.
create or replace function public.shortcut_list(p_key text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare c record; bn boolean;
begin
  select * into c from public.shortcut_ctx(p_key);
  if c.uid is null then
    return json_build_object('ok', false, 'message', 'Shortcut key is not valid. Make a new key in PaiPoisha → More. · শর্টকাট কী সঠিক নয়। পাই-পয়সা → আরও থেকে নতুন কী বানান।');
  end if;
  bn := c.lang = 'bn';
  return json_build_object(
    'ok', true,
    'wallet', coalesce(c.wallet_name, ''),
    'title', case when bn then 'খরচটা কিসের জন্য? (ঐচ্ছিক)' else 'What is the expense for? (optional)' end,
    'amount', case when bn then 'কত টাকা?' else 'How much?' end,
    'category', case when bn then 'কোন ক্যাটাগরি?' else 'Which category?' end,
    'confirm', case when bn then 'খরচটি সেভ করবেন?' else 'Save this expense?' end,
    'categories', coalesce((
      select json_agg(public.shortcut_cat_name(x, c.lang) order by x.sort_order, x.created_at)
      from public.categories x
      where x.user_id = c.uid and x.type = 'expense' and not x.hidden and x.deleted_at is null
        and x.key is distinct from 'adjustment'
    ), '[]'::json));
end $$;

-- Shortcut step 2: save the expense (today, last-used wallet). Never raises: always returns
-- { ok, message } so the Shortcut can show the message.
create or replace function public.shortcut_add(p_key text, p_amount numeric, p_category text, p_note text default '')
returns json
language plpgsql security definer set search_path = '' as $$
declare c record; bn boolean; cat public.categories; paisa bigint; cat_name text;
begin
  select * into c from public.shortcut_ctx(p_key);
  if c.uid is null then
    return json_build_object('ok', false, 'message', 'Shortcut key is not valid. Make a new key in PaiPoisha → More. · শর্টকাট কী সঠিক নয়। পাই-পয়সা → আরও থেকে নতুন কী বানান।');
  end if;
  bn := c.lang = 'bn';
  -- range first, so the bigint cast can't overflow; then whole paisa only (at most 2 decimals)
  if p_amount is null or p_amount <= 0 or p_amount > 99999999999 or p_amount * 100 <> trunc(p_amount * 100) then
    return json_build_object('ok', false, 'message', case when bn then 'টাকার পরিমাণ সঠিক নয়।' else 'The amount is not valid.' end);
  end if;
  paisa := (p_amount * 100)::bigint;
  select x.* into cat from public.categories x
  where x.user_id = c.uid and x.type = 'expense' and not x.hidden and x.deleted_at is null
    and x.key is distinct from 'adjustment'
    and lower(trim(coalesce(p_category, ''))) in (lower(public.shortcut_cat_name(x, c.lang)), lower(x.name_en), lower(x.name_bn))
  order by x.sort_order limit 1;
  if cat.id is null then
    return json_build_object('ok', false, 'message', case when bn then 'ক্যাটাগরি পাওয়া যায়নি।' else 'Category not found.' end);
  end if;
  if c.wallet_id is null then
    return json_build_object('ok', false, 'message', case when bn then 'কোনো ওয়ালেট নেই।' else 'No wallet to save to.' end);
  end if;
  insert into public.transactions (id, user_id, type, amount_paisa, wallet_id, category_id, note, occurred_at)
  values (gen_random_uuid(), c.uid, 'expense', paisa, c.wallet_id, cat.id, left(trim(coalesce(p_note, '')), 100), now());
  cat_name := public.shortcut_cat_name(cat, c.lang);
  return json_build_object('ok', true, 'message',
    (case when bn then 'সেভ হয়েছে: ' else 'Saved: ' end) || public.shortcut_money(paisa, c.bn_digits) || ' · ' || cat_name || ' · ' || c.wallet_name);
end $$;

-- Supabase grants execute on new public functions to anon and authenticated by default; narrow that.
revoke all on function public.shortcut_new_key() from public, anon;
grant execute on function public.shortcut_new_key() to authenticated;
revoke all on function public.shortcut_ctx(text) from public, anon, authenticated;
revoke all on function public.shortcut_cat_name(public.categories, text) from public, anon, authenticated;
revoke all on function public.shortcut_money(bigint, boolean) from public, anon, authenticated;
grant execute on function public.shortcut_list(text) to anon, authenticated;
grant execute on function public.shortcut_add(text, numeric, text, text) to anon, authenticated;
