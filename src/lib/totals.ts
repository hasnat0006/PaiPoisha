/**
 * Period totals (money-rules skill): Spent = expenses + transfer fees; Income = income;
 * transfer amounts and the "adjustment" category are left out of both; Net = Income − Spent.
 * Callers pass entries already limited to the period and with deleted rows removed.
 */
import type { Category, Transaction } from "@/db/types";
import type { Paisa } from "./money";

type Tx = Pick<Transaction, "type" | "amount_paisa" | "fee_paisa" | "category_id">;

export interface Totals {
  income: Paisa;
  spent: Paisa;
  net: Paisa;
}

/** System category ids the totals need. Either may be missing (e.g. before seeding). */
export interface TotalsCtx {
  adjustmentId?: string;
  feesId?: string;
}

export const totalsCtx = (cats: Pick<Category, "id" | "key">[]): TotalsCtx => ({
  adjustmentId: cats.find((c) => c.key === "adjustment")?.id,
  feesId: cats.find((c) => c.key === "fees")?.id,
});

export function periodTotals(txs: Tx[], { adjustmentId }: TotalsCtx): Totals {
  let income = 0;
  let spent = 0;
  for (const t of txs) {
    if (t.type === "transfer") spent += t.fee_paisa;
    else if (t.category_id === adjustmentId) continue;
    else if (t.type === "income") income += t.amount_paisa;
    else spent += t.amount_paisa;
  }
  return { income, spent, net: income - spent };
}

/** Spent per category id, biggest first. Transfer fees count under the "fees" category. */
export function spendingByCategory(txs: Tx[], { adjustmentId, feesId }: TotalsCtx): { categoryId: string; spent: Paisa }[] {
  const by = new Map<string, Paisa>();
  const add = (id: string | null | undefined, p: Paisa) => {
    if (id && p > 0) by.set(id, (by.get(id) ?? 0) + p);
  };
  for (const t of txs) {
    if (t.type === "transfer") add(feesId, t.fee_paisa);
    else if (t.type === "expense" && t.category_id !== adjustmentId) add(t.category_id, t.amount_paisa);
  }
  return [...by].map(([categoryId, spent]) => ({ categoryId, spent })).sort((a, b) => b.spent - a.spent);
}

/** The top n slices plus one "others" total (0 if there are none). */
export function topWithOthers<T extends { spent: Paisa }>(rows: T[], n = 5): { top: T[]; others: Paisa } {
  return { top: rows.slice(0, n), others: rows.slice(n).reduce((s, r) => s + r.spent, 0) };
}

/** Signed net of a set of entries (for day and filter totals), same rules as periodTotals. */
export const netOf = (txs: Tx[], ctx: TotalsCtx): Paisa => periodTotals(txs, ctx).net;
