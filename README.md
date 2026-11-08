# PaiPoisha — পাই-পয়সার হিসাব

A free, bilingual money tracker for Bangladesh. Web app first (PWA), then Android and iOS.

## First-time setup (Windows)

```powershell
cd D:\Projects\PaiPoisha
npm install
npm run check                 # typecheck + lint + tests + build — should all pass
npm run dev                   # http://localhost:3000
```

Optional, for login and sync (roadmap step 7): copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.

## Scripts

`scripts/` is part of the project; commit it.

| File | What it does |
| --- | --- |
| `build-sw.mjs` | Writes the offline service worker (`out/sw.js`). Runs on every `npm run build`, so builds and deploys fail without it. |
| `build-sw.test.ts` | Tests for the service worker builder; part of `npm run check`. |
| `make-icons.mjs` | Draws the logo and app icons into `public/icons/` and `src/app/favicon.ico`. Run `node scripts/make-icons.mjs` only when the logo changes. |

## What goes in git

Commit everything except what `.gitignore` already leaves out:

- `node_modules/`, `.next/`, `out/` — rebuilt by `npm install` and `npm run build`
- `.env*` files (only `.env.example` is committed) — keeps Supabase keys out of git
- `memory/` — local working notes for AI sessions

