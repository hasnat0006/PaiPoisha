# Money Management App — MVP Plan

Nov 7, 2026 · @Hasnat

## Summary

A free money tracker for one person, in Bangla and English, made for Bangladesh: cash, bKash, Nagad and bank in one place. It starts as an installable web app (PWA) at zero cost, and the same code is later wrapped into Android and iOS apps.

**Decisions so far**

- **Users:** Bangladesh first; one account = one person (no shared wallets in the MVP)
- **Languages:** বাংলা and English, switchable at any time
- **Frontend:** Next.js
- **Login:** Google
- **Cloud sync:** Supabase (recommended below over Google Drive and Neon)
- **The gap we fill:** a free app that works the same on Android and iPhone, with fast entry (including from iOS Shortcuts)

## Architecture & tech stack

The app is local-first: every entry is saved on the phone first (it works offline and feels instant), then synced to Supabase in the background.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Your choice; large ecosystem |
| UI | Tailwind CSS + shadcn/ui | Fast to build, looks native on mobile |
| Local database | Dexie (IndexedDB) | Offline storage in the browser; instant reads |
| Login + cloud DB | Supabase (Auth with Google + Postgres) | Google login and database in one free service |
| Languages | next-intl | Bangla/English text and number formatting |
| Charts | Recharts | Simple dashboard charts |
| PWA | Serwist (@serwist/next) | Install to home screen + offline caching |
| Hosting | Vercel Hobby while building; Cloudflare later | Free; see Costs for the catch |
| Mobile apps (later) | Capacitor | Wraps the same web code for Play Store / App Store |

**One rule that keeps the mobile path open:** build the app as a client-side app that talks to Supabase directly (protected by Row Level Security). Avoid putting core features in Next.js API routes or Server Actions. Then `output: "export"` produces static files that Capacitor can bundle into the Android and iOS apps with no server.

## Login & sync

Recommendation: Supabase, with Google as the login provider. Syncing into the user's own Google Drive is possible, but it makes you write the whole sync engine yourself.

| Option | How it works | Pros | Cons |
| --- | --- | --- | --- |
| **Supabase (recommended)** | Google login through Supabase Auth; data in Postgres, each row locked to its owner by Row Level Security | Login + database in one; real queries; easy to add features later; the browser talks to it directly (no server) | Free projects pause after 7 days with no activity; 500 MB database on the free plan |
| Google Drive app folder | Google login, then save a data file into a hidden, app-only folder in the user's Drive (`drive.appdata` scope) | Data lives in the user's own Drive; costs you nothing; the scope is non-sensitive, so only basic Google verification | It stores files, not a database: you write all merge and conflict logic; no server-side queries; the folder is deleted if the user removes the app from Drive |
| Neon | Serverless Postgres only | Good Postgres, generous free tier | No login and no direct browser access, so you need Auth.js plus your own API server, which breaks the "no server" rule above |

**Sync method (local-first, last write wins)**

1. Every row gets a UUID made on the device, plus `updated_at` and `deleted_at` (deletes are soft, so they sync too).
2. **Push:** send rows changed on the device since the last sync.
3. **Pull:** fetch rows whose `updated_at` is newer than the last pull, and write them into Dexie.
4. If the same row changed in two places, the newer `updated_at` wins. With one person per account, this will almost never happen.

The Google Drive option is still useful later as an extra "Back up to my Google Drive" button.

## MVP scope

The MVP does one job well: record money in and out quickly, and show where it went this month.

**In the MVP**

- Google sign-in (the app also works before sign-in, saving only on the device)
- Wallets: Cash, bKash, Nagad, Rocket, bank account, card, each with an opening balance
- Add income, expense, and transfer between wallets (e.g. bKash → Cash for a cash-out)
- Categories: a ready-made bilingual set, plus custom ones
- A monthly budget per category, with a warning near the limit
- Dashboard: this month's income, spending, balance per wallet, spending by category
- Transaction list: filter by month, wallet and category; text search
- Language switch (বাংলা / English) and a Bangla-digits option
- Dark mode
- CSV export
- Works offline; installable to the home screen
- Quick add by link (for iOS Shortcuts; see below)

**Not in the MVP (later phases)**

- Shared or family accounts
- Recurring transactions (rent, subscriptions)
- Loans given and taken (ধার)
- Savings goals
- Reading bKash/bank SMS automatically
- Receipt scanning, AI insights
- Multiple currencies
- Reminders and push notifications

## MVP feature spec

Each feature below lists what it does, the rules it follows, the edge cases to handle, and a "done when" check you can test by hand.

### 1. Onboarding & sign-in

A new user can start recording expenses within 60 seconds of opening the app, with or without signing in.

**Flow**

1. **Language screen:** two big buttons, বাংলা and English. The phone's language is pre-selected.
2. **Wallet screen:** Cash is ticked by default; bKash, Nagad, Rocket, Upay, Bank and Card can be ticked. Each ticked wallet gets an optional opening balance field (blank = ৳0).
3. **Sign-in screen:** "Continue with Google" plus a "Skip for now" link. The screen says in one line that signing in keeps the data safe if the phone is lost.
4. Land on Home with a one-time tip pointing at the + button.

**Rules**

- Skipping sign-in is allowed. All data stays on the device, and Settings shows a "Not backed up" warning.
- Signing in later uploads everything already on the device; nothing is lost.
- Signing in on a second device downloads the existing data. Onboarding is skipped if the account already has wallets.
- Sign-out asks for confirmation. If anything hasn't synced yet, the user is told and can sync first.

**Edge cases**

- The user closes the Google popup → return to the sign-in screen with no error message.
- No internet on the sign-in screen → the button is disabled with "Needs internet"; Skip still works.
- The user signs in on a device that already holds local data **and** the account has cloud data → merge both sets (UUIDs never clash), then show a one-line summary: "Added 12 entries from this device."

**Done when:** on a fresh phone, a user can finish onboarding offline, add an entry, sign in later, and see that entry on a second phone.

### 2. Wallets

A wallet is any place money sits. Its balance is always calculated from its entries, so it can never drift out of step with them.

**Fields:** name (required, up to 30 characters), type (Cash / Mobile banking / Bank / Card), provider (for mobile banking: bKash, Nagad, Rocket, Upay, Other), opening balance, colour, icon.

**Rules**

- At least one wallet must always exist. The last active wallet cannot be archived.
- A wallet with entries cannot be deleted, only archived. Archived wallets disappear from pickers and totals but stay in history and reports.
- A wallet with no entries can be deleted outright.
- Balances may go negative (e.g. a credit card, or an entry forgotten earlier). Show them in red; don't block it.
- **Adjust balance:** if the real bKash balance differs from the app's, the user types the real amount and the app adds an "Adjustment" entry for the difference. Entering past transactions is never required.
- Wallets can be reordered by drag; the order is used everywhere.

**Done when:** creating, editing, reordering, archiving and adjusting a wallet all work offline and sync, and Home totals change straight away.

### 3. Adding, editing and deleting entries

Adding a typical expense takes the amount plus at most 3 taps: amount → category → Save (the wallet and date are pre-filled).

**The add sheet** (opens from the + button, from bottom to top)

- Tabs at the top: Expense (default) · Income · Transfer
- Large amount display with the app's own number pad (0–9, decimal point, backspace, and + and − for quick sums like 120+80)
- Category grid: the 8 most-used categories first, then "More"
- Wallet chips: defaults to the wallet used last
- Date: defaults to today; chips for Today and Yesterday, or a date picker
- Note: optional, up to 100 characters
- Save button, plus "Save & add another"

**Transfer tab:** From wallet → To wallet, amount, optional fee (e.g. bKash cash-out charge). The fee is recorded as an expense in the "Fees & charges" category, taken from the From wallet.

**Validation**

| Check | Rule | Message |
| --- | --- | --- |
| Amount | More than ৳0, at most ৳99,99,99,999, up to 2 decimal places | "Enter an amount" |
| Category | Required for expense and income | Highlight the grid |
| Transfer wallets | From and To must be different | "Choose two different wallets" |
| Date | No later than today | Future dates are greyed out |

**Edit and delete**

- Tapping an entry in any list opens the same sheet, filled in, with a Delete button.
- Delete shows a 5-second "Undo" bar instead of a confirmation popup. Deleting sets `deleted_at`; the row is never truly removed, so it can sync.
- Editing changes `updated_at`, and the edit syncs like a new entry.

**Done when:** expense, income and transfer (with and without a fee) all save offline, show on Home immediately, and correct the wallet balances; undo works after a delete.

### 4. Categories

The app ships with the bilingual default categories (see Bangladesh-specific details) and lets users shape their own list.

**Rules**

- Each category has a Bangla name and an English name. A custom category needs only one; the app shows that name in both languages.
- Users can add, rename, recolour, change the icon of and reorder categories, and hide defaults.
- A category with entries can't be deleted, only hidden. Its entries keep their category, and reports still show it.
- Expense and income categories are separate lists.
- One built-in, undeletable category for each: "Other" (expense and income), "Fees & charges", and "Balance adjustment".

**Done when:** a renamed or hidden category updates everywhere at once, and old entries still show the right category.

### 5. Budgets

A budget is a monthly spending limit for one expense category. It is a guide, not a block: users can always go over it.

**Rules**

- Budgets are optional and set per category. An "Overall" budget for total monthly spending is also allowed.
- Each month copies the previous month's budgets automatically, until the user changes them.
- Progress = this period's expenses in that category ÷ the limit. Transfers never count.
- "This period" follows the month start day (e.g. the 7th to the 6th of the next month).

**What the user sees**

| Spent | Bar colour | Extra |
| --- | --- | --- |
| Under 75% | Green | Remaining amount, e.g. "৳1,200 left" |
| 75–99% | Amber | "৳300 left · 9 days to go" |
| 100% or more | Red | "৳450 over" |

In the MVP, warnings appear only inside the app (on the Budgets tab and as a small badge after saving an entry), not as notifications.

**Done when:** setting a budget, adding entries and changing the month start day all update the bars correctly.

### 6. Home dashboard

Home answers "How am I doing this month?" in one screen, with no scrolling needed for the top part.

**From top to bottom**

1. Period switcher: ‹ November 2026 › (swipe or tap to change)
2. Three numbers: Income · Spent · Net (income − spent; green or red)
3. Total balance across all active wallets, then a scrollable row of wallet cards with balances
4. Spending by category: a donut chart of the top 5 categories plus "Others"; tapping a slice opens that category's entries
5. Budgets near or over the limit (only if any exist)
6. The last 5 entries, with "See all"

**Rules:** wallet balances are all-time totals (not just this period). Income, Spent and the chart cover the chosen period only. Transfers and balance adjustments are left out of Income and Spent.

**Empty state:** a friendly line and a big "Add your first expense" button.

**Done when:** the numbers on Home match a hand calculation from a test set of 30 mixed entries.

### 7. Transaction list & search

One list of every entry, newest first, grouped by day with a daily total.

- **Filters (can be combined):** period, type (expense / income / transfer), wallet, category. Active filters show as chips that can be removed.
- **Search:** matches the note and the category name, in either language, and also amounts (typing 450 finds ৳450 entries).
- **Row:** category icon, category name, note (one line), wallet, amount (red for expense, green for income, grey for transfer).
- **Footer:** the total of the filtered entries.
- **Speed:** loads in pages of 50 entries as the user scrolls; stays smooth with 10,000 entries.

**Done when:** filtering "bKash + Transport + October" shows exactly the right entries and total.

### 8. Settings, language & export

**Settings list**

| Setting | Options | Default |
| --- | --- | --- |
| Language | বাংলা / English | Picked at onboarding |
| Digits | Bangla (১২৩) / English (123) | Bangla digits when the language is Bangla |
| Theme | Light / Dark / Match phone | Match phone |
| Month starts on | Day 1–28 | 1 |
| Account | Google email, sync status, Sync now, Sign out | — |
| Data | Export CSV, Manage wallets, Manage categories | — |
| Quick add | Copy my quick-add link, Install iOS Shortcut | — |
| About | Version, privacy policy, send feedback | — |

**Language rules**

- Switching language changes the whole app at once, with no reload, and is remembered.
- Every on-screen text comes from the translation files; no hard-coded words. A missing translation falls back to English, and is logged during development.
- Dates follow the language: "৭ নভেম্বর ২০২৬" or "7 Nov 2026".
- Amounts typed with Bangla digits are accepted too.

**CSV export**

- Columns: Date, Type, Amount, Wallet, To wallet, Category, Note.
- Filters: a date range (default: all time).
- The file is UTF-8 with a BOM, so Bangla text opens correctly in Excel. Amounts are written in English digits with no ৳ sign, so spreadsheets can add them up.
- File name: `money-export-2026-11-07.csv`.

**Done when:** a Bangla-language export opens in Excel and Google Sheets with readable Bangla text and summable amounts.

### 9. Quick-add link

`/add` opens the add sheet with any of these optional fields filled in:

| Parameter | Values | Example |
| --- | --- | --- |
| `type` | expense, income, transfer | `type=expense` |
| `amount` | number | `amount=150` |
| `cat` | category key or name in either language | `cat=transport` |
| `wallet` | wallet key or name | `wallet=bkash` |
| `note` | text (URL-encoded) | `note=rickshaw` |

**Rules:** the link never saves anything on its own; the user always taps Save. Unknown values are ignored, and the field is left for the user to pick. A link opened before onboarding starts onboarding first, then opens the sheet.

**The iOS Shortcut:** we publish one ready-made Shortcut (Ask amount → Choose category → Open link) and link to it from Settings, with 3 screenshots showing how to add it to the home screen.

**Done when:** on an iPhone, running the Shortcut from the home screen opens the app with the amount and category filled in.

### 10. Offline & sync behaviour

The user should never have to think about sync: every action works offline, and the cloud catches up on its own.

**When sync runs**

- When the app opens, when it comes back to the foreground, and when the phone reconnects to the internet
- About 3 seconds after any change (several quick changes go in one sync)
- When the user taps "Sync now" in Settings

**Sync status (small icon in the Home header + a line in Settings)**

| State | Icon | Text in Settings |
| --- | --- | --- |
| Up to date | Cloud with a tick | "Synced 2 minutes ago" |
| Syncing | Spinning | "Syncing…" |
| Offline, changes waiting | Cloud with a dot | "Offline · 4 changes will sync later" |
| Error | Cloud with ! | "Couldn't sync. Tap to retry" |
| Not signed in | Cloud crossed out | "Not backed up. Sign in to keep your data safe" |

**Rules**

- Each sync pushes local changes first, then pulls remote ones. Rows go up and down in batches of 500.
- Conflict: the newer `updated_at` wins (last write wins). Times come from the server when saved, so a phone with the wrong clock can't win unfairly.
- A failed sync retries after 5 s, 30 s, then 2 min, without bothering the user; the icon turns to Error only after the third try.
- If the Supabase project is paused or down, the app keeps working locally and syncs once it's back.
- **Sign-out:** sync first if possible, then wipe the local database, so the next person using the phone sees nothing.
- **Storage safety:** the app asks the browser for persistent storage, so it doesn't clear the data when the phone runs low on space. On iPhone this needs the app installed to the home screen; onboarding shows how.

**Done when:** in airplane mode, a user adds 10 entries, edits 2 and deletes 1; when back online, a second device shows exactly the same data within 10 seconds.

### 11. Quality bar

The MVP must feel fast on a budget Android phone on a slow mobile connection, since that is what many users in Bangladesh have.

| Area | Target |
| --- | --- |
| First load | Usable within 3 s on a slow 4G connection; first download under 300 KB of JavaScript (gzipped) |
| Opening again | Under 1 s (loaded from the offline cache) |
| Saving an entry | Shows in lists straight away (under 100 ms) |
| Test phone | One budget Android phone (about 3 GB of RAM) and one older iPhone |
| Security | Row Level Security on every table; Supabase service key never in the app; HTTPS only |
| Privacy | Short privacy policy (Bangla + English): what is stored, where, and how to delete it; a "Delete my account and data" button |
| Accessibility | Tap targets at least 44 px; readable contrast; works with large system text |
| Errors | Every error has a plain message in the current language; no blank screens |

**Testing**

- Unit tests (Vitest) for money logic: balances, budget periods, paisa conversion, CSV export.
- One end-to-end test (Playwright) of the core flow: onboarding → add → edit → delete → sync.
- Manual check on both test phones before each release, in both languages.

### MVP launch checklist

- [ ] Every "Done when" check above passes on Android and iPhone
- [ ] Every screen checked in Bangla and English
- [ ] Installed to the home screen on both phones; works fully offline
- [ ] Row Level Security tested: a second test account cannot see the first account's data
- [ ] Privacy policy and account deletion live
- [ ] Google login consent screen set up with app name, logo and privacy policy link
- [ ] Feedback link in Settings (a simple Google Form is enough)
- [ ] 10–20 beta testers invited, with a short WhatsApp/Messenger group for feedback

## Bangladesh-specific details

These details are what make the app feel built for Bangladesh rather than translated.

- **Two languages:** every label lives in `messages/bn.json` and `messages/en.json`; first launch asks for the language. Use a Bangla font such as Hind Siliguri or Noto Sans Bengali.
- **Taka formatting:** show ৳ with lakh grouping (৳1,00,000, not ৳100,000). `Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT" })` handles Bangla digits; test the English-digit version on real phones.
- **Store money as whole paisa** (integer: ৳150.50 = 15050), never as decimals, so totals never drift.
- **Wallet presets:** Cash, bKash, Nagad, Rocket, Upay, bank, card, each with its brand colour.
- **Default categories (bilingual):** বাজার / Groceries, যাতায়াত / Transport (rickshaw, CNG, bus), মোবাইল রিচার্জ / Mobile recharge, বাসা ভাড়া / Rent, বিদ্যুৎ / Electricity, গ্যাস / Gas, ইন্টারনেট / Internet, খাবার / Eating out, পড়াশোনা / Education, চিকিৎসা / Medical, পরিবারকে পাঠানো / Sent to family; income: বেতন / Salary, টিউশন / Tuition, ফ্রিল্যান্স / Freelance.
- **Cash-out fee:** a bKash → Cash transfer can carry an optional fee, saved as an expense.
- **Month start day:** let users start the month on salary day (e.g. the 1st or the 7th).

## Quick add from iOS Shortcuts and Android

The MVP supports a quick-add link that opens the add screen already filled in, so saving takes one tap.

**The link format**

`https://<your-app>/add?type=expense&amount=150&cat=transport&wallet=bkash&note=rickshaw`

**iOS Shortcut (users can install it from a link you share)**

1. Ask for Input → amount (number)
2. Choose from Menu → category
3. Open URL → the link above, filled with those answers
4. Add the shortcut to the home screen, the Action Button or Back Tap

**Later**

- **Save without opening the app:** the Shortcut sends the entry straight to a Supabase Edge Function using a personal key from Settings.
- **Android Share:** the PWA registers as a share target. A user copies a bKash SMS, taps Share → the app, and it reads out the amount.
- **Reading SMS automatically:** possible only in the native Android app, and Google Play restricts SMS permission heavily, so treat it as uncertain.

## Data model

Five tables, the same in Dexie and Supabase. Every table also has `id` (UUID), `user_id`, `created_at`, `updated_at` and `deleted_at` for sync. Wallet balances are calculated from transactions, never stored.

| Table | Key fields |
| --- | --- |
| `settings` | `language` (bn / en), `bangla_digits`, `theme`, `month_start_day` |
| `wallets` | `name`, `kind` (cash / mfs / bank / card), `provider` (bkash, nagad, …), `opening_balance_paisa`, `color`, `icon`, `archived`, `sort_order` |
| `categories` | `name_en`, `name_bn`, `type` (expense / income), `icon`, `color`, `is_default`, `sort_order` |
| `transactions` | `type` (expense / income / transfer), `amount_paisa` (integer), `wallet_id`, `to_wallet_id` (transfers only), `category_id` (empty for transfers), `fee_paisa`, `note`, `occurred_at` |
| `budgets` | `category_id`, `month` (YYYY-MM), `limit_paisa` |

**Security:** turn on Row Level Security for every table in Supabase, with one rule: `user_id = auth.uid()`. Users can then only ever read or write their own rows, even though the browser talks to the database directly.

**Balance formula:** opening balance + income − expenses − transfers out − fees + transfers in.

## Screens

Seven screens, with a bottom tab bar (Home · Transactions · Budgets · More) and a big + button that is always visible.

| Screen | What's on it |
| --- | --- |
| Onboarding | Choose a language → pick wallets and opening balances → optional Google sign-in |
| Home | Month total spent vs income, wallet balances, spending by category, last 5 entries |
| Add / edit entry | Bottom sheet: number pad for the amount, category grid, wallet chips, date, note |
| Transactions | Grouped by day; filter by month, wallet, category; search |
| Budgets | Bar per category: spent / limit, turns red over 90% |
| Wallets | List with balances; add, edit, archive |
| Settings | Language, digits, theme, month start day, account and sync status, CSV export, Shortcut setup |

Design rule: adding an expense should take at most 3 taps plus typing the amount.

## Roadmap & build order

Build the offline app first, then add login and sync. That way every step is usable, and the hardest part (sync) lands on a working base.

**Phase 1: MVP (web)**

- [ ] 1\. Set up: Next.js + TypeScript + Tailwind + shadcn/ui + next-intl; deploy a hello-world page
- [ ] 2\. Dexie database with the 5 tables; add and list transactions (offline, no login)
- [ ] 3\. Wallets, categories (bilingual defaults), and wallet balances
- [ ] 4\. Home dashboard and the transaction list with filters
- [ ] 5\. Budgets and CSV export
- [ ] 6\. PWA: install prompt, offline caching, app icon
- [ ] 7\. Supabase: tables + Row Level Security, Google login, push/pull sync
- [ ] 8\. Quick-add link + a shareable iOS Shortcut
- [ ] 9\. Beta test with 10–20 friends and family on both Android and iPhone

**Phase 2: Grow the web app**

- [ ] Recurring transactions, loans (ধার), savings goals
- [ ] Save from a Shortcut without opening the app; Android share target for SMS
- [ ] Optional Google Drive backup

**Phase 3: Native apps**

- [ ] Static export + Capacitor builds for Android and iOS
- [ ] Native touches (haptics, widgets, notifications) so the app store sees a real app, not a website in a box

## Costs & free-tier catches

Phases 1 and 2 can cost ৳0. Money is needed only for the app stores, a custom domain, or once the app earns money.

| Item | Cost | Catch |
| --- | --- | --- |
| Supabase Free | $0 | [500 MB database, 2 projects; pauses after 7 days of inactivity](https://makerkit.dev/blog/saas/supabase-pricing). Daily users keep it awake; during development, open the app at least weekly. Pro is $25/month. |
| Vercel Hobby | $0 | [Personal, non-commercial use only](https://vercel.com/docs/limits/fair-use-guidelines). Fine for building and testing; before adding ads or a paid plan, move to Cloudflare or pay for Pro. |
| Google login | $0 | Supabase Google login uses basic profile scopes; Drive backup would add [`drive.appdata`, a non-sensitive scope](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) |
| Domain (optional) | Approx. $10/year | A free `*.vercel.app` address works to start |
| Google Play | Approx. $25 once (Phase 3) | Check the current fee before signing up |
| Apple Developer | Approx. $99/year (Phase 3) | Apple can reject apps that are only a wrapped website |

## Open questions

- [ ] App name (works in both Bangla and English?)
- [ ] Should loans (ধার) move into the MVP? Lending to friends and family is very common.
- [ ] Show the Bangla calendar date beside the English one?
- [ ] Long-term plan to make money: free forever, a premium tier, or no money at all?
- [ ] Who are the first 10–20 beta testers, and how many use iPhone?

## Sources

- [Google: Choose Google Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google: Store application-specific data](https://developers.google.com/drive/appdata)
- [Vercel: Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Makerkit: Supabase pricing in 2026](https://makerkit.dev/blog/saas/supabase-pricing)
