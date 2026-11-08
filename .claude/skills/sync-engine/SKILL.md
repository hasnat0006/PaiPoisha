---
name: sync-engine
description: How login (Google via Supabase Auth) and local-first sync between Dexie and Supabase must work in the money app — push/pull order, conflicts, retries, sign-in merge, sign-out wipe, and sync status. Use for any work in src/sync/, on auth, or on offline behaviour (roadmap step 7 and later).
---

# Login & sync

The full behaviour spec is `docs/mvp-plan.md` → "MVP feature spec" §1 (sign-in) and §10 (offline & sync). This skill is how to build it.

## Architecture

```
UI ──read/write──▶ Dexie (src/db) ──_dirty rows──▶ src/sync/engine.ts ──▶ Supabase (RLS)
                     ▲                                        │
                     └──────────── pulled rows ◀──────────────┘
```

- The UI **never** waits for the network. All reads and writes are Dexie.
- `src/sync/engine.ts` exports `syncNow(): Promise<SyncResult>` and a status store (`useSyncStatus()`) with the states: `up_to_date | syncing | offline_pending | error | signed_out`.
- `src/lib/supabase.ts` returns `null` with no env vars → the engine reports `signed_out` and does nothing.

## Auth

- `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: <origin>/auth/callback/ } })`. The callback page is a **client** page that waits for the session and then routes to Home.
- No server-side auth helpers (`@supabase/ssr` cookies): this is a static app, and the session lives in localStorage via supabase-js.
- After the first sign-in: set `user_id` on all local rows, mark them dirty, and sync. This is the merge in spec §1, which is safe because ids are UUIDs.

## One sync cycle

1. If not signed in or offline → set the status and stop.
2. **Push:** for each table in `SYNCED_TABLES` order, read rows with `_dirty = 1`, strip `_dirty`, `upsert` in batches of 500 (`onConflict: "id"`). On success, set `_dirty = 0` **only if `updated_at` hasn't changed since you read it** (the user may have edited during the push).
3. **Pull:** read `meta.last_pull_at`. For each table, `select * where updated_at > last_pull_at order by updated_at` in pages of 500. Write into Dexie, except a local row that is `_dirty` and newer.
4. Save the **server's** largest `updated_at` seen as `last_pull_at` (never the phone's clock).

## Conflicts

Last write wins on `updated_at`. The server sets `updated_at` with a trigger, so a wrong phone clock can't win. Deletes are rows with `deleted_at`, so they sync like edits.

## Triggers and retries

- Run on: app start, `visibilitychange` → visible, `online` event, 3 s after the last local write (debounce), and "Sync now".
- Only one sync at a time (a lock flag; extra calls queue one follow-up run).
- Retry backoff: 5 s → 30 s → 2 min; show `error` only after the third failure.

## Sign-out

Push first if online (warn if there are unsynced rows) → `supabase.auth.signOut()` → `db.delete()` → reload to onboarding.

## Storage safety

On first run, call `navigator.storage.persist()`. On iOS, data is only reliably kept once the app is installed to the home screen, so onboarding shows how.

## Tests (required)

Use fake-indexeddb plus a mocked Supabase client. Cover: push marks rows clean; an edit during a push stays dirty; pull doesn't overwrite a newer dirty local row; deletes sync; paging over 500 rows; `last_pull_at` uses the server time; sign-out wipes Dexie.

## Never

- Call Supabase from components or hooks other than `src/sync/` and the auth screens
- Send `_dirty` or other local-only fields to Supabase
- Hard-delete rows, or use the service_role key
- Block the UI with a spinner while syncing
