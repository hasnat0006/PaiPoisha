---
name: mobile-ui
description: Look-and-feel and component rules for the money app — shadcn/ui usage, mobile-first layout, the add-entry sheet, navigation, colours, dark mode, and loading/empty/error states. Use whenever building or changing a screen or component.
---

# Mobile UI rules

The target is a **360 px-wide, ~3 GB RAM Android phone, often on a slow connection**, plus older iPhones. If it feels good there, it's good everywhere.

## Components

- Use **shadcn/ui** (`src/components/ui/`). Add new ones with `npx shadcn@latest add <name>`. Don't hand-write a component that shadcn already has.
- Mapping: bottom sheets → `drawer` (the add sheet) or `sheet`; confirmations → `alert-dialog` (only for Sign out / Delete account); toasts and Undo → `sonner`; tabs → `tabs`; progress bars → `progress`.
- Icons: `lucide-react` only. Wallet and category icons are stored as lucide names.
- App components go in `src/components/<feature>/`, named `PascalCase.tsx`, one component per file.

## Layout

- Single column, `max-w-md mx-auto`, padding `p-4`. No desktop-only layouts in the MVP.
- Bottom tab bar: a floating glass pill, Home · Transactions · **+** · Budgets · More. The + in the middle is a larger solid primary circle inside the bar (user, 2026-11-09), so it stands apart from the tabs.
- Respect iPhone safe areas: `pb-[env(safe-area-inset-bottom)]` on bottom bars.
- Tap targets of at least 44 × 44 px (`min-h-11 min-w-11`).
- Text: body `text-base`, labels `text-sm`, totals `text-2xl font-semibold tabular-nums`. Never smaller than `text-xs`.
- Amounts always get `whitespace-nowrap tabular-nums`, so "+৳1,23,456" never breaks across lines; shrink the text size instead.
- Corners: **only `rounded-md`** (user, 2026-11-08). No pills or circles (`rounded-full`); every radius token maps to md in `globals.css`. **Exception: the tab bar** (user, 2026-11-09) may use any rounding: it is a pill with a round +. The selected tab is brand green (`text-brand`) with a small dot under it, never a background. Swiping left/right on a tab's page moves between tabs (`useSwipeTabs`); mark anything with its own horizontal drag `data-no-swipe`.

## The add-entry sheet (the most important screen)

- Opens instantly from the + button. Amount first, with **our own number pad**: don't focus a text input (the phone keyboard covers the sheet).
- Target: **amount + 3 taps** to save an expense (spec §3).
- Remembers the last wallet used. Date defaults to today.
- Fields are labelled rows: `Category [Select category]`, `Wallet [bKash ▾]` (themed `FieldSelect` dropdowns, not native `<select>`), `Date [Today] [picker]`, then the note.
- An unsaved new entry is kept for 2 minutes after closing (`features/entries/entryDraft.ts`).

## Colours

- Theme tokens from shadcn CSS variables (`bg-background`, `text-muted-foreground`, …). No raw hex colours in components, except wallet and category colours from data.
- Meaning: expense = red (`text-red-600 dark:text-red-400`), income = green (`text-green-600 dark:text-green-400`), transfer = muted grey. Never use colour alone: also show a − / + sign or an icon.
- Dark mode must work on every screen (Tailwind `dark:` variants via shadcn tokens).

## Every screen handles

1. **Loading:** skeletons, not spinners, for lists and cards
2. **Empty:** one friendly line + one main action ("Add your first expense")
3. **Error:** a plain message in the user's language + Retry. Never a blank screen.

## Performance

- Lists over 50 items: paginate or virtualise (spec §7).
- Import Recharts only on screens that use it (`next/dynamic` with `ssr: false`).
- No images in the MVP except icons; no animations longer than 200 ms.

## Never

- Server Components that fetch data, or `next/image` with remote optimisation (static export)
- Hover-only actions (phones can't hover)
- Popups on page load, or more than one main button per screen
- Visible text that isn't from the message files (see `i18n-bangla`)
