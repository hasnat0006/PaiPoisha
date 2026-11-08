# Progress

Roadmap from `docs/mvp-plan.md`. Tick a step only when `npm run check` passes and its "Done when" checks are verified.

## Phase 1: MVP (web)

- [x] 1. Set up: Next.js + TypeScript + Tailwind + next-intl + static export; base data layer (types, Dexie, repo), money helpers, SQL migration, CLAUDE.md and skills
  - [x] 1b. Run `npx shadcn@latest init` (done in step 2: base-nova preset, Base UI)
  - [ ] 1c. Deploy a first page (Vercel Hobby or Cloudflare Pages)
- [x] 2. Add and list transactions offline (no login): spec §3
- [x] 3. Wallets, categories (bilingual defaults) and wallet balances: spec §2, §4
- [x] 4. Home dashboard and the transaction list with filters: spec §6, §7
- [x] 5. Budgets: spec §5, plus the "Month starts on" setting (More tab). CSV export was moved to a later plan
- [x] 5b. Settings screen: digits, theme (spec §8); language and month start day are on the More tab already
- [ ] 5c. CSV export (spec §8), postponed from step 5
- [x] 6. PWA: install prompt, offline caching (own service worker, not Serwist), app icons (placeholder ৳)
- [ ] 7. Supabase: run the migrations, Google login, push/pull sync: spec §1, §10
- [x] 8. Quick-add link (`/add?…`) and Android app shortcuts: spec §9
  - [ ] 8b. iOS Shortcut (ready-made Shortcut + steps on the More tab), postponed
- [ ] 9. Beta test with 10–20 people on Android and iPhone

## Phase 2

- [ ] Recurring entries, loans (ধার), savings goals
- [ ] Save from a Shortcut without opening the app; Android share target
- [ ] Optional Google Drive backup

## Phase 3

- [ ] Capacitor builds for Android and iOS
