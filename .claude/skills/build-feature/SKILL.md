---
name: build-feature
description: The step-by-step workflow for building any feature or roadmap step of the money management app. Use at the start of every implementation task ("build wallets", "do roadmap step 3", "add the budgets screen").
---

# Build a feature

Follow these steps in order. Don't skip one, even for a small feature.

## 1. Find the spec

- Open `docs/progress.md` and find the current roadmap step.
- Read the matching section of `docs/mvp-plan.md` (the "MVP feature spec" §1–11, plus "Data model" and "Screens").
- Copy that section's **Rules**, **Edge cases** and **Done when** into your plan, word for word. These are the acceptance criteria.
- If the spec doesn't say how something should behave, **ask the user**. Don't guess, and don't add features the spec leaves out.

## 2. Plan (show the user before writing code if more than ~5 files change)

List:
- files to create or change
- any schema change (→ load the `data-model` skill)
- new strings (→ `i18n-bangla`)
- money or period logic (→ `money-rules`)
- UI components needed (→ `mobile-ui`)

## 3. Build in this order (bottom up)

1. **Types and schema**: `src/db/types.ts`, plus Dexie and SQL if the schema changes
2. **Pure logic**: `src/lib/*.ts`. No React, no Dexie. Write the unit tests at the same time.
3. **Data hooks**: `src/features/<feature>/use<Thing>.ts`, using `useLiveQuery` from `dexie-react-hooks` for reads and `src/db/repo.ts` for writes
4. **UI**: `src/components/<feature>/…` and the route in `src/app/…`
5. **Strings**: add every new key to both `bn.json` and `en.json`

## 4. Always / never

**Always**
- Filter out soft-deleted rows (`!row.deleted_at`) in every read
- Handle the three UI states: loading, empty, error
- Keep components under ~150 lines; move logic into hooks or `src/lib`
- Use the `@/` import alias
- Leave a short comment at the top of each new file saying what it does

**Never**
- Add server code (see CLAUDE.md rule 1)
- Add a new npm package without saying why and asking first
- Touch files unrelated to the feature, or reformat whole files
- Leave `console.log`, `TODO` without a roadmap step number, or `any`
- Mark work done while `npm run check` fails

## 5. Finish

1. Run `npm run check`. Fix everything until it passes.
2. Walk through each **Done when** item and say how you verified it (test name, or manual steps for the user).
3. Tick the step in `docs/progress.md`. If you made an architecture choice, add a line to `docs/decisions.md`.
4. Summarise for the user: what was built, how to try it (`npm run dev` → which screen), anything left open.
5. Suggest a commit message in the form `feat(wallets): add wallet list and archive` (conventional commits).
