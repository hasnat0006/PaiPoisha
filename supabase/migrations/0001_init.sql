-- 0001_init: base tables for the MVP. Mirrors src/db/types.ts.
-- Rules: money = bigint paisa; every table has RLS with user_id = auth.uid();
-- rows are soft-deleted (deleted_at) so deletes can sync.
-- updated_at is set by the server (trigger) so a wrong phone clock can't win conflicts.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- settings ---------------------------------------------------------------
create table public.settings (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  language text not null default 'bn' check (language in ('bn','en')),
  bangla_digits boolean not null default true,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  month_start_day smallint not null default 1 check (month_start_day between 1 and 28),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- wallets ----------------------------------------------------------------
create table public.wallets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  kind text not null check (kind in ('cash','mfs','bank','card')),
  provider text check (provider in ('bkash','nagad','rocket','upay','other')),
  opening_balance_paisa bigint not null default 0,
  color text not null,
  icon text not null,
  archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- categories -------------------------------------------------------------
create table public.categories (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text,
  name_en text,
  name_bn text,
  type text not null check (type in ('expense','income')),
  icon text not null,
  color text not null,
  is_default boolean not null default false,
  is_system boolean not null default false,
  hidden boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (name_en is not null or name_bn is not null)
);

-- transactions -----------------------------------------------------------
create table public.transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('expense','income','transfer')),
  amount_paisa bigint not null check (amount_paisa > 0 and amount_paisa <= 9999999999900),
  wallet_id uuid not null references public.wallets(id),
  to_wallet_id uuid references public.wallets(id),
  category_id uuid references public.categories(id),
  fee_paisa bigint not null default 0 check (fee_paisa >= 0),
  note text not null default '' check (char_length(note) <= 100),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((type = 'transfer') = (to_wallet_id is not null)),
  check (type = 'transfer' or category_id is not null),
  check (to_wallet_id is null or to_wallet_id <> wallet_id)
);
create index transactions_user_occurred on public.transactions (user_id, occurred_at desc);

-- budgets ----------------------------------------------------------------
create table public.budgets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  limit_paisa bigint not null check (limit_paisa > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- shared: updated_at trigger, pull index, RLS -----------------------------
do $$
declare t text;
begin
  foreach t in array array['settings','wallets','categories','transactions','budgets'] loop
    execute format('create trigger %I_updated_at before insert or update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
    execute format('create index %I_user_updated on public.%I (user_id, updated_at)', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
