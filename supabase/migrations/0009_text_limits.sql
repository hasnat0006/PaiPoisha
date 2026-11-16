-- 1. Length limits on the free-text columns 0001 left open, so one account can't fill the free database
--    (500 MB, then read-only for everyone). Today's longest values: color 7, icon 15, key 18 characters;
--    names match the app's 30-character limit (CATEGORY_NAME_MAX).
alter table public.wallets
  add constraint wallets_color_len check (char_length(color) <= 20),
  add constraint wallets_icon_len check (char_length(icon) <= 40);
alter table public.categories
  add constraint categories_key_len check (char_length(key) <= 40),
  add constraint categories_name_en_len check (char_length(name_en) <= 30),
  add constraint categories_name_bn_len check (char_length(name_bn) <= 30),
  add constraint categories_color_len check (char_length(color) <= 20),
  add constraint categories_icon_len check (char_length(icon) <= 40);

-- 2. track(true) counts a sign-in; cap it at 10 a day per user so one account can't skew the admin chart.
create or replace function public.track(p_sign_in boolean default false) returns void
language sql security definer set search_path = '' as $$
  insert into public.activity (user_id, day, sign_ins)
  select auth.uid(), (now() at time zone 'Asia/Dhaka')::date, case when p_sign_in then 1 else 0 end
  where auth.uid() is not null
  on conflict (user_id, day) do update set sign_ins = least(public.activity.sign_ins + excluded.sign_ins, 10)
$$;
