/**
 * Budgets (spec §5, money-rules skill). A month with no budget rows of its own uses the
 * latest earlier month's rows (read-time copy-forward; nothing is written automatically).
 * Progress uses period Spent: expenses + transfer fees (under "fees"), never transfer amounts.
 */
import type { Budget } from "@/db/types";
import type { Paisa } from "./money";

type B = Pick<Budget, "category_id" | "month" | "limit_paisa" | "deleted_at">;

/** The budgets that apply to `monthKey`, and the month they come from (null if none). */
export function budgetsFor<T extends B>(budgets: T[], monthKey: string): { rows: T[]; fromMonth: string | null } {
  const live = budgets.filter((b) => !b.deleted_at && b.month <= monthKey);
  const fromMonth = live.reduce<string | null>((m, b) => (m === null || b.month > m ? b.month : m), null);
  return { rows: live.filter((b) => b.month === fromMonth), fromMonth };
}

/** The budgets the user sees for a month: limit 0 means "removed". */
export const activeBudgets = <T extends B>(budgets: T[], monthKey: string): T[] =>
  budgetsFor(budgets, monthKey).rows.filter((b) => b.limit_paisa > 0);

export type BudgetStatus = "ok" | "near" | "over";

export interface Progress {
  ratio: number; // spent ÷ limit (may be > 1)
  status: BudgetStatus; // ok < 75%, near 75–99%, over ≥ 100%
  left: Paisa; // limit − spent (negative = over)
  daysLeft: number | null; // days to go, counting today; null if the period isn't the current one
}

const DAY_MS = 86_400_000;

export function budgetProgress(spent: Paisa, limit: Paisa, period: { start: string; end: string }, now: Date): Progress {
  const ratio = limit > 0 ? spent / limit : 0;
  const status: BudgetStatus = ratio >= 1 ? "over" : ratio >= 0.75 ? "near" : "ok";
  const t = now.getTime();
  const start = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();
  const current = t >= start && t < end;
  // Periods start at Dhaka midnight, so whole days to the end, rounded up, include today.
  return { ratio, status, left: limit - spent, daysLeft: current ? Math.ceil((end - t) / DAY_MS) : null };
}
