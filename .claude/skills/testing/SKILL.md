---
name: testing
description: What to test and how in the money app (Vitest, fake-indexeddb, Testing Library), plus the checks that must pass before any task is called done. Use when writing tests, fixing a failing check, or finishing a task.
---

# Testing & finishing a task

## Tools

- **Vitest** + **jsdom**: `npm test` (once) or `npm run test:watch`
- **fake-indexeddb**: loaded in `vitest.setup.ts`, so Dexie works in tests. Reset with `await db.delete(); await db.open();` in `beforeEach`.
- **@testing-library/react**: for component tests (query by role or visible text, never by class)
- Tests sit next to the code: `money.ts` → `money.test.ts`

## What must have tests

| Code | Required |
| --- | --- |
| `src/lib/*` (money, periods, totals, parsing) | Yes, including edge cases (see `money-rules`) |
| `src/db/repo.ts`, schema upgrades | Yes |
| `src/sync/*` | Yes (list in `sync-engine`) |
| Hooks with logic | Yes, if they do more than call a lib function |
| Plain presentational components | Optional; test the add-entry sheet flow |

## Writing a good test

- One behaviour per `it(...)`, named as a sentence: `it("ignores soft-deleted entries in the balance")`.
- Use readable test data: amounts in paisa with a comment, e.g. `15000 // ৳150`.
- Use fixed dates in `Asia/Dhaka` (`"2026-11-07T10:00:00+06:00"`), never `new Date()` without control (use `vi.setSystemTime`).

## Before saying "done"

1. `npm run check` passes (typecheck, lint, tests, static build). The build step catches server-only features that break `output: "export"`.
2. Each **Done when** item from the spec is covered by a test or by manual steps you write out for the user.
3. Manual checks you ask the user to do on a phone (open the dev site on the LAN: `npm run dev -- -H 0.0.0.0`, then `http://<pc-ip>:3000`):
   - both languages
   - light and dark mode
   - offline (airplane mode after the first load), once the PWA step is done
   - a 360 px-wide screen

## Never

- Delete or skip a failing test to make the check pass. Fix the code, or explain to the user why the test is wrong.
- Mock the code under test, or test implementation details (internal state, class names).
- Leave `.only` or `.skip` in committed tests.
