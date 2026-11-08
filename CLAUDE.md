@AGENTS.md

# PaiPoisha · পাই-পয়সা (money management app)

A free, bilingual (বাংলা / English) personal money tracker for Bangladesh: cash, bKash, Nagad, Rocket, bank and card in one place. It's a web app (PWA) first, wrapped later for Android and iOS with Capacitor. One account = one person.

- **Full plan and feature spec:** `docs/mvp-plan.md` (the source of truth for what to build)
- **Progress:** `docs/progress.md` (tick roadmap steps here)
- **Decisions log:** `docs/decisions.md` (add one entry for each architecture choice)

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run check` | typecheck + lint + tests + static build. **Must pass before you say a task is done.** |
| `npm test` | Vitest unit tests |
| `npm run build` | Static export to `out/` |
| `npm run preview` | Serve `out/` locally (as the real app is served) |
| `npx shadcn@latest add <name>` | Add a UI component into `src/components/ui/` |

## Stack

Next.js 16 (App Router, `output: "export"`) · TypeScript strict · Tailwind CSS v4 · shadcn/ui · next-intl (client-side only) · Dexie (IndexedDB) · Supabase (Google login + Postgres + RLS) · Recharts · Vitest · Hind Siliguri font via @fontsource.

## Folder structure

```
src/
  app/            routes (every page is a client page; no server code)
  components/ui/  shadcn components (generated — edit only for theme tweaks)
  components/     app components, one folder per feature (wallets/, entries/, …)
  db/             types.ts (data model), db.ts (Dexie schema), repo.ts (writes)
  features/       feature logic + hooks, e.g. features/budgets/useBudgets.ts
  i18n/           provider.tsx (language, useMoney)
  lib/            pure helpers: money.ts, dates.ts, … (no React, fully tested)
  messages/       bn.json, en.json (every visible string)
  sync/           sync engine (roadmap step 7)
supabase/migrations/  SQL, numbered 0001_, 0002_, … (never edit an applied one)
docs/             plan, progress, decisions
```

## Hard rules (never break these)

1. **No server code.** No Server Actions, Route Handlers, `cookies()`, `headers()`, middleware/proxy, rewrites, redirects, ISR, or `cacheComponents`. Pages that use state or hooks start with `"use client"`. The app must build with `output: "export"`.
2. **Money is integer paisa.** Fields end in `_paisa`. Parse with `parseAmount`, show with `useMoney().formatMoney`. Never do float maths on taka, and never use `toFixed` for display.
3. **UI reads and writes only Dexie.** Writes go through `src/db/repo.ts` (`insertRow`, `updateRow`, `softDelete`) so ids, timestamps and `_dirty` are always set. Never call Supabase from a component.
4. **Never hard-delete synced rows.** Set `deleted_at`. Every query hides rows where `deleted_at` is set.
5. **No hard-coded visible text.** Every string goes in both `src/messages/bn.json` and `en.json` under the same key.
6. **Schema changes touch three places together:** `src/db/types.ts`, a new Dexie `version()` in `src/db/db.ts`, and a new `supabase/migrations/NNNN_*.sql` with RLS.
7. **Secrets:** only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may appear in the app. Never the service_role key. Never commit `.env.local`.
8. **Mobile first:** design for a 360 px-wide budget Android phone; tap targets at least 44 px; it must work offline.
9. **Stay in scope:** build what `docs/mvp-plan.md` says for the current roadmap step. If something is unclear or seems wrong, ask; don't invent features.
10. **This Next.js version may differ from your training data:** check `node_modules/next/dist/docs/` before using an API you're not sure about.

## Skills — load the matching one before starting

| Task | Skill |
| --- | --- |
| Building any feature or roadmap step | `build-feature` (start here) |
| Adding or changing a table or field | `data-model` |
| Any visible text, dates, numbers or language | `i18n-bangla` |
| Balances, totals, budgets, periods, transfers | `money-rules` |
| Screens, components, layout, styling | `mobile-ui` |
| Login, sync, offline behaviour | `sync-engine` |
| Writing or running tests; finishing a task | `testing` |
