---
name: data-model
description: How to add or change a table, field or index in the money app so that Dexie (local), Supabase (cloud) and TypeScript types stay in sync. Use for any schema change, new table, new field, or a new query that needs an index.
---

# Change the data model

The data model lives in **three places that must always match**:

| Place | File | Role |
| --- | --- | --- |
| Types | `src/db/types.ts` | Shape of every row; the source of truth |
| Local DB | `src/db/db.ts` | Dexie schema (only indexed fields are listed) |
| Cloud DB | `supabase/migrations/NNNN_name.sql` | Postgres tables + Row Level Security |

## Every table has these sync fields

`id uuid` (made on the device with `crypto.randomUUID()`), `user_id`, `created_at`, `updated_at`, `deleted_at`. Locally there is also `_dirty` (0/1), which is **never** sent to Supabase.

## Steps for a change

1. **Types:** edit the interface in `src/db/types.ts`. New tables also go in `SYNCED_TABLES`, in parent-before-child order.
2. **Dexie:** add a **new** `this.version(N + 1).stores({...})` block that lists **all** tables with the new indexes. Never edit an existing version block. If existing rows need a default value, add `.upgrade(tx => tx.table("x").toCollection().modify(r => { r.field ??= default }))`.
3. **SQL:** create the next numbered file, e.g. `supabase/migrations/0002_add_wallet_note.sql`. Never edit an earlier migration.
   - A new table must have: `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, the `set_updated_at` trigger, an index on `(user_id, updated_at)`, `enable row level security`, and the `"own rows"` policy (copy the pattern from `0001_init.sql`).
   - Money: `bigint`, column name ending in `_paisa`, with `check` constraints for its limits.
   - Enums: `text` + `check (col in (...))`, matching the TypeScript union exactly.
4. **Sync columns:** add the column to `COLUMNS` in `src/sync/engine.ts`, and the field to the matching sample in the `COLUMNS` test in `engine.test.ts` (TypeScript and the test fail until both match). Only listed columns are uploaded: an unknown field makes Supabase reject the whole batch with a 400, which once blocked all sync.
5. **Repo and tests:** if `repo.ts` or the sync needs to know about the change, update it. Add a test that writes and reads the new field.
6. Run the new migration in Supabase (dev project first, then production) before shipping app code that needs it. With the Supabase connector Claude can apply it, after the user says yes for production.

## Index rules (Dexie)

- Index only fields used in `where()`, `orderBy()` or compound lookups.
- Common lookups get compound indexes, e.g. `[wallet_id+occurred_at]`.
- Always keep `_dirty` and `updated_at` indexed on synced tables (the sync engine needs them).

## Always / never

**Always:** soft-delete with `deleted_at`; store dates as ISO-8601 UTC strings; keep field names `snake_case`, the same in TypeScript and SQL.

**Never:** store calculated values such as wallet balances or totals (calculate them from transactions); use float/numeric for money; drop or rename a column without asking (it breaks phones on the old version: add the new column, migrate, then remove it later); disable RLS, even for testing.
