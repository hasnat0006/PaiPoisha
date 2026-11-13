# Database backups

The Supabase free plan has no backups you can restore from. A GitHub Action
(`.github/workflows/db-backup.yml`) dumps the data every night at 03:30 Dhaka time, encrypts it
and keeps it as a downloadable file (artifact) for 90 days.

The repo is public, so anyone signed in to GitHub can download the artifacts. That's why each file
is encrypted first: without the passphrase it is useless. **Use a long random passphrase and keep
it somewhere safe (a password manager). If you lose it, the backups can't be opened.**

## One-time setup

1. **Get the connection string.** Supabase dashboard → your project → **Connect** → **Session pooler**
   (not "Direct connection": GitHub's machines can't reach it). Copy the URI and put your database
   password in place of `[YOUR-PASSWORD]`. Forgot it? Project Settings → Database → Reset database password.
2. **Make a passphrase**, e.g. in Git Bash: `openssl rand -base64 32`. Save it in your password manager.
3. **Add two secrets on GitHub**: repo → Settings → Secrets and variables → Actions → New repository secret:
   - `DATABASE_URL` = the connection string from step 1
   - `BACKUP_PASSPHRASE` = the passphrase from step 2
4. **Test it:** repo → Actions → Database backup → **Run workflow**. After about a minute the run
   should be green with a `db-backup-YYYY-MM-DD` artifact at the bottom of its page.

GitHub emails you when a scheduled run fails. In a public repo, scheduled workflows are switched off
after 60 days without any commits; GitHub emails a warning first, and one click turns it back on.

## Restoring

1. Download the artifact (a zip) from the run's page and unzip it to get `backup.sql.gz.enc`.
2. Decrypt it in Git Bash (asks for the passphrase):

   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in backup.sql.gz.enc | gunzip > backup.sql
   ```

3. The file holds data only. Into a **new, empty** Supabase project: run every file in
   `supabase/migrations/` in order (SQL Editor), then load the data with pg_dump's partner tool:

   ```bash
   psql "<new project's session pooler URI>" --single-transaction -f backup.sql
   ```

   Then put the new project's URL and anon key in `.env.production.local` and in Vercel.

`backup.sql` is everyone's money data in plain text: delete it once you're done.

## Keeping the project awake (cron-job.org)

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
