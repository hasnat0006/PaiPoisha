-- 0006_shortcut_menu: the iOS Shortcut's confirm step becomes an edit menu where the user can
-- change category, wallet and date before saving (user, 2026-11-14). shortcut_list also returns
-- the wallets, the default category and the menu texts; shortcut_add takes an optional wallet and
-- date. The old 4-argument call still works (both new arguments have defaults).

-- Shortcut step 1: texts, expense categories, wallets and the defaults the menu starts with.
create or replace function public.shortcut_list(p_key text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare c record; bn boolean; def_cat text;
begin
  select * into c from public.shortcut_ctx(p_key);
  if c.uid is null then
    return json_build_object('ok', false, 'message', 'Shortcut key is not valid. Make a new key in PaiPoisha → More. · শর্টকাট কী সঠিক নয়। পাই-পয়সা → আরও থেকে নতুন কী বানান।');
  end if;
  bn := c.lang = 'bn';
  -- default category: the one used by the newest expense, else the first in the user's order
  select public.shortcut_cat_name(x, c.lang) into def_cat from public.categories x
  left join lateral (
    select max(t.created_at) as used from public.transactions t
    where t.category_id = x.id and t.type = 'expense' and t.deleted_at is null
  ) u on true
  where x.user_id = c.uid and x.type = 'expense' and not x.hidden and x.deleted_at is null
    and x.key is distinct from 'adjustment'
  order by u.used desc nulls last, x.sort_order, x.created_at limit 1;
  return json_build_object(
    'ok', true,
    'wallet', coalesce(c.wallet_name, ''),
    'category_default', coalesce(def_cat, ''),
    'title', case when bn then 'খরচটা কিসের জন্য? (ঐচ্ছিক)' else 'What is the expense for? (optional)' end,
    'amount', case when bn then 'কত টাকা?' else 'How much?' end,
    'category', case when bn then 'কোন ক্যাটাগরি?' else 'Which category?' end,
    'wallet_prompt', case when bn then 'কোন ওয়ালেট থেকে?' else 'Which wallet?' end,
    'date_prompt', case when bn then 'কোন দিনের খরচ?' else 'Which day?' end,
    'confirm', case when bn then 'খরচটি সেভ করবেন?' else 'Save this expense?' end,
    'save', case when bn then '✅ সেভ' else '✅ Save' end,
    'cancel', case when bn then '✖ বাতিল' else '✖ Cancel' end,
    'categories', coalesce((
      select json_agg(public.shortcut_cat_name(x, c.lang) order by x.sort_order, x.created_at)
      from public.categories x
      where x.user_id = c.uid and x.type = 'expense' and not x.hidden and x.deleted_at is null
        and x.key is distinct from 'adjustment'
    ), '[]'::json),
    'wallets', coalesce((
      select json_agg(w.name order by w.sort_order, w.created_at)
      from public.wallets w
      where w.user_id = c.uid and w.deleted_at is null and not w.archived
    ), '[]'::json));
end $$;

-- A new signature would sit next to the old one as an overload and make PostgREST calls ambiguous.
drop function public.shortcut_add(text, numeric, text, text);

-- Shortcut step 2: save the expense. Empty wallet = last-used wallet; no date = today.
-- Dates follow buildEntry in src/lib/entries.ts: today = now, a past day = noon Dhaka, future refused.
-- Never raises: always returns { ok, message } so the Shortcut can show the message.
create function public.shortcut_add(p_key text, p_amount numeric, p_category text, p_note text default '',
  p_wallet text default '', p_date date default null)
returns json
language plpgsql security definer set search_path = '' as $$
declare c record; bn boolean; cat public.categories; paisa bigint; cat_name text;
  w_id uuid; w_name text; today date := (now() at time zone 'Asia/Dhaka')::date; occurred timestamptz;
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
  if trim(coalesce(p_wallet, '')) = '' then
    w_id := c.wallet_id; w_name := c.wallet_name;
    if w_id is null then
      return json_build_object('ok', false, 'message', case when bn then 'কোনো ওয়ালেট নেই।' else 'No wallet to save to.' end);
    end if;
  else
    select w.id, w.name into w_id, w_name from public.wallets w
    where w.user_id = c.uid and w.deleted_at is null and not w.archived
      and lower(w.name) = lower(trim(p_wallet))
    order by w.sort_order limit 1;
    if w_id is null then
      return json_build_object('ok', false, 'message', case when bn then 'ওয়ালেট পাওয়া যায়নি।' else 'Wallet not found.' end);
    end if;
  end if;
  if p_date > today then
    return json_build_object('ok', false, 'message', case when bn then 'ভবিষ্যতের তারিখে খরচ যোগ করা যায় না।' else 'The date can''t be in the future.' end);
  end if;
  occurred := case when p_date is null or p_date = today then now()
             else (p_date::text || ' 12:00:00+06')::timestamptz end;
  insert into public.transactions (id, user_id, type, amount_paisa, wallet_id, category_id, note, occurred_at)
  values (gen_random_uuid(), c.uid, 'expense', paisa, w_id, cat.id, left(trim(coalesce(p_note, '')), 100), occurred);
  cat_name := public.shortcut_cat_name(cat, c.lang);
  return json_build_object('ok', true, 'message',
    (case when bn then 'সেভ হয়েছে: ' else 'Saved: ' end) || public.shortcut_money(paisa, c.bn_digits) || ' · ' || cat_name || ' · ' || w_name);
end $$;

revoke all on function public.shortcut_add(text, numeric, text, text, text, date) from public;
grant execute on function public.shortcut_add(text, numeric, text, text, text, date) to anon, authenticated;
