# Progress

Roadmap from `docs/mvp-plan.md`. Tick a step only when `npm run check` passes and its "Done when" checks are verified.

## Phase 1: MVP (web)

- [x] 1. Set up: Next.js + TypeScript + Tailwind + next-intl + static export; base data layer (types, Dexie, repo), money helpers, SQL migration, CLAUDE.md and skills
  - [x] 1b. Run `npx shadcn@latest init` (done in step 2: base-nova preset, Base UI)
  - [x] 1c. Deploy a first page (Vercel Hobby or Cloudflare Pages) — live at https://paipoisha.vercel.app/
- [x] 2. Add and list transactions offline (no login): spec §3
- [x] 3. Wallets, categories (bilingual defaults) and wallet balances: spec §2, §4
- [x] 4. Home dashboard and the transaction list with filters: spec §6, §7
- [x] 5. Budgets: spec §5, plus the "Month starts on" setting (More tab). CSV export was dropped from the plan (user, 2026-11-13)
- [x] 5b. Settings screen: digits, theme (spec §8); language and month start day are on the More tab already
- [x] 6. PWA: install prompt, offline caching (own service worker, not Serwist), app icons (placeholder ৳)
- [x] 7. Supabase: run the migrations, Google login, push/pull sync: spec §1, §10 (two-device test passed, user, 2026-11-13)
- [x] 8. Quick-add link (`/add?…`) and Android app shortcuts: spec §9
  - [ ] 8b. iOS Shortcut, changed (user, 2026-11-09) to save **without opening the app** (Phase 2 item pulled forward): migration 0003 applied, More-tab key + steps built. Waiting for the user to build the Shortcut from `docs/ios-shortcut.md`, share its iCloud link (`SHORTCUT_URL`) and test it on the iPhone
- [ ] 9. Beta test with 10–20 people on Android and iPhone

## Phase 2

- [ ] Recurring entries, loans (ধার), savings goals
- [ ] Save from a Shortcut without opening the app; Android share target
- [ ] Optional Google Drive backup

## Phase 3

- [ ] Capacitor builds for Android and iOS
