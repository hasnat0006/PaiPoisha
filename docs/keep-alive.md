# Keeping the Supabase project awake

There are no database backups (user, 2026-11-16): the nightly GitHub backup was removed. The free
Supabase plan has none you can restore from, so a lost or damaged database can't be brought back.

A free Supabase project pauses after 7 days without database activity. cron-job.org calls the
`heartbeat()` SQL function (migration 0005) once a day; each call writes one timestamp. It uses only
the public publishable key, which is already in every copy of the app; no password leaves Supabase.

Create a cron job at https://console.cron-job.org with:

| Setting | Value |
| --- | --- |
| URL | `https://fueoxqmlqbxvubrolsqw.supabase.co/rest/v1/rpc/heartbeat` |
| Schedule | Every day, e.g. 04:00 (Asia/Dhaka) |
| Advanced → Request method | `POST` |
| Advanced → Headers | `apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.production.local>` and `Content-Type: application/json` |
| Advanced → Request body | `{}` |
| Notifications | On failure: on |

Click **Test run**: the answer should be status 200 with a timestamp such as `"2026-11-13T22:00:00+00:00"`.
To see the last beat, run `select * from heartbeat;` in the Supabase SQL Editor.

If the project pauses anyway, the job fails and cron-job.org emails you: open the Supabase
dashboard and click **Restore project**.
