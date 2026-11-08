/** Budget rows for one period: limit, spent and progress, Overall first. Used by Budgets, Home and the save toast. */
import type { Budget, Transaction } from "@/db/types";
import { activeBudgets, budgetProgress, type Progress } from "@/lib/budgets";
import type { EntryFields } from "@/lib/entries";
import { getPeriod, inPeriod, type Period } from "@/lib/period";
import { periodTotals, spendingByCategory, totalsCtx } from "@/lib/totals";
import type { EntriesData } from "../entries/useEntries";

export interface BudgetRow {
  budget: Budget;
  spent: number;
  progress: Progress;
}

export function budgetRows(data: EntriesData, period: Period, now = new Date()): BudgetRow[] {
  const ctx = totalsCtx(data.categories);
  const txs = data.entries.filter((t) => inPeriod(t.occurred_at, period));
  const byCat = new Map(spendingByCategory(txs, ctx).map((r) => [r.categoryId, r.spent]));
  const overall = periodTotals(txs, ctx).spent;
  const order = new Map(data.categories.map((c, i) => [c.id, i]));
  return activeBudgets(data.budgets, period.key)
    .filter((b) => b.category_id === null || order.has(b.category_id)) // skip budgets for deleted categories
    .sort((a, b) => (a.category_id === null ? -1 : b.category_id === null ? 1 : order.get(a.category_id)! - order.get(b.category_id)!))
    .map((budget) => {
      const spent = budget.category_id === null ? overall : (byCat.get(budget.category_id) ?? 0);
      return { budget, spent, progress: budgetProgress(spent, budget.limit_paisa, period, now) };
    });
}

/**
 * After saving an entry: the budget it touches (its category, or Overall) that is now near or over
 * the limit, worst first; null if none. `row` is the saved entry, `editingId` the entry it replaced.
 */
export function budgetAlert(data: EntriesData, row: EntryFields, editingId?: string, now = new Date()): BudgetRow | null {
  if (row.type === "income" || (row.type === "transfer" && row.fee_paisa === 0)) return null;
  const entries = [...data.entries.filter((t) => t.id !== editingId), row as Transaction];
  const hit = (b: Budget) => b.category_id === null || b.category_id === row.category_id || (row.fee_paisa > 0 && b.category_id === totalsCtx(data.categories).feesId);
  return (
    budgetRows({ ...data, entries }, getPeriod(row.occurred_at, data.startDay), now)
      .filter((r) => r.progress.status !== "ok" && hit(r.budget))
      .sort((a, b) => b.progress.ratio - a.progress.ratio)[0] ?? null
  );
}
