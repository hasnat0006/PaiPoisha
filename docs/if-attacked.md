# If the app is attacked

What protects the data, the limits that stop abuse, and what to do when something goes wrong.

## What is public, and why that's fine

The Supabase URL and the publishable key (`sb_publishable_…`) are in every copy of the web app and in the
iPhone Shortcut. They are meant to be public. They only let someone call the database **as an anonymous visitor**,
and an anonymous visitor:

- reads **0 rows** from every table (row-level security; tested 2026-11-16);
- can call only four functions: `heartbeat` (keep-alive), `report_error` (crash reports, capped),
  `shortcut_list` and `shortcut_add` (both need a valid personal Shortcut key; only a SHA-256 of each key is stored).

Signed-in users can read and change only their own rows (`user_id = auth.uid()`). The admin functions refuse anyone
who isn't in the `admins` table.

## Limits (migrations 0009 and 0010)

| What | Limit |
| --- | --- |
| Text fields | colour 20, icon/key 40, names 30, note 100 characters |
| Rows per account | entries 50,000 · wallets 50 · categories 200 · budgets 5,000 · settings 50 |
| New rows per account per day | 5,000 (all tables together) |
| Crash reports | 100 new an hour, 5,000 in all, kept 30 days; repeats within an hour only add to a count |
| Sign-ins counted | 10 a day per user |

Going over a row limit refuses that upload: the phone keeps its data and shows "Couldn't sync".
If a real user ever hits one, raise the number in a new migration (`enforce_row_limits()`).

The admin dashboard shows the **database size**; the tile turns red at 70% of the free 500 MB.
At 500 MB the database turns read-only and sync stops for everyone.

## When something looks wrong

### The database is growing fast (dashboard tile red, or Supabase emails about usage)

1. Find the biggest accounts in the Supabase SQL Editor:
   `select user_id, count(*) from transactions group by 1 order by 2 desc limit 10;`
   (and the same for `wallets`, `categories`, `budgets`; `select count(*) from client_errors;`)
2. If one account is clearly abusive: Supabase → Authentication → Users → find it by id → **Delete user**.
   Every table cascades, so all its rows go with it.
3. If crash reports are the cause: `delete from client_errors;` (they are only diagnostics).

### Someone has your Shortcut key

Make a new key in the app (More → iPhone Shortcut → step 1). The old key stops working at once.
Delete any fake entries in the app.

### The API is being flooded (app slow, Supabase shows a spike in requests)

Nothing leaks and nothing is damaged by a flood; it can only make things slow while it lasts.

1. Wait it out if it's short. Check Supabase → Logs → API for the source.
2. If it continues: Supabase → Project Settings → API Keys → create a **new publishable key**, then delete the old one.
   Put the new key in Vercel (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) and in `.env.production.local`, and redeploy.
   Old copies of the app reload into the new version; until then their sync fails.
3. The iPhone Shortcut has the key built in (`apikey` header on both **Get Contents of URL** actions): update it,
   share a new iCloud link, and put that link in `SHORTCUT_URL` (`src/components/sync/IosShortcut.tsx`).
   Users must install the Shortcut again and paste their key.

### The website itself is flooded

The site is static files on Vercel's CDN, which absorbs most floods. If needed: Vercel → the project → Firewall →
turn on **Attack Challenge Mode** (free), and turn it off when it's over.

### Restoring data

There are no backups (removed 2026-11-16, see `docs/decisions.md`). Each signed-in phone keeps a full local copy,
so a user's data can come back from their phone after a database problem, as long as they don't sign out.
