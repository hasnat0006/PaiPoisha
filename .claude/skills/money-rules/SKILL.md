---
name: money-rules
description: The exact business rules for money in this app — paisa, wallet balances, transfers and fees, income/spent totals, budget periods with a custom month start day, and adjustments. Use for any code that calculates, totals, filters by period, or validates amounts.
---

# Money rules

All of this logic lives in **pure functions in `src/lib/`** (no React, no Dexie) with unit tests. Hooks fetch rows and pass them to these functions.

## Amounts

- Integer paisa everywhere (`Paisa` type in `src/lib/money.ts`). ৳150.50 = 15050.
- Valid entry amount: `isValidAmount()`, which means more than 0 and at most ৳99,99,99,999. `amount_paisa` is always positive; `type` gives the direction.
- User input → `parseAmount()` (accepts Bangla digits and sums like `120+80`).

## Wallet balance (calculated, never stored)

```
balance(w) = w.opening_balance_paisa
           + Σ income   where wallet_id = w
           − Σ expense  where wallet_id = w
           − Σ (transfer.amount + transfer.fee) where wallet_id = w   (money leaves the From wallet)
           + Σ transfer.amount where to_wallet_id = w                  (fee is not received)
```
Ignore rows with `deleted_at`. Balances may be negative (show them in red, never block them). Balances are **all-time**, not per period.

## Transfers and fees

- A transfer moves money between two **different** wallets and has **no category**.
- A fee (e.g. bKash cash-out) is stored on the transfer row as `fee_paisa`, and counts as an **expense** in the system category `fees` for totals and charts. It is not a separate row.

## Adjustments

"Adjust balance" creates an income or expense row (whichever closes the gap) in the system category `adjustment`, for `|real − app|`.

## Period totals (Home, Budgets, Reports)

- **Spent** = Σ expense amounts + Σ transfer fees, in the period.
- **Income** = Σ income amounts in the period.
- **Excluded from both:** transfer amounts, and anything in the `adjustment` category.
- **Net** = Income − Spent.

## Periods and the month start day

`month_start_day` (1–28) from settings. With a start day of 7, the "November 2026" period is **7 Nov 00:00 → 6 Dec 23:59:59** in `Asia/Dhaka`. Put one helper in `src/lib/period.ts`, `getPeriod(date, startDay) → { start, end, key: "2026-11" }`, and use it everywhere. Never calculate periods inline.

- An entry belongs to a period by its `occurred_at` (not `created_at`).
- Budgets are keyed by the period `key` (`"YYYY-MM"` of the period's start).
- A month with no budget rows uses the latest earlier month's budgets (copy-forward is read-time, so nothing is written automatically).

## Budgets

progress = period spent in that category ÷ `limit_paisa`. Colour: under 75% green, 75–99% amber, 100% or more red. The "overall" budget (`category_id = null`) uses total Spent.

## Must-have tests for any change here

Zero entries; deleted rows ignored; a transfer with a fee; a negative balance; a period crossing a month boundary (start day 7); a period crossing a year (December → January); an amount at the max limit.
