/**
 * Transaction list filters and search (spec §7). Filters combine (AND).
 * Search matches the note, the category name in either language, or the amount.
 */
import type { Category, Transaction, TransactionType } from "@/db/types";
import { dhakaDay } from "./entries";
import { parseAmount } from "./money";
import { inPeriod, type Period } from "./period";

/** A user-picked day range, "YYYY-MM-DD" in Dhaka time; both days included. */
export interface DayRange {
  from: string;
  to: string;
}

export interface Filters {
  period: Period | null;
  range: DayRange | null; // used instead of period ("Custom dates")
  type: TransactionType | null;
  walletId: string | null;
  categoryId: string | null;
  search: string;
}

export const NO_FILTERS: Filters = { period: null, range: null, type: null, walletId: null, categoryId: null, search: "" };

export function filterEntries(txs: Transaction[], f: Filters, categories: Map<string, Category>): Transaction[] {
  const q = f.search.trim().toLowerCase();
  const qAmount = q ? parseAmount(q) : null; // "450" or "৪৫০" → 45000 paisa
  return txs.filter((t) => {
    if (f.period && !inPeriod(t.occurred_at, f.period)) return false;
    if (f.range) {
      const day = dhakaDay(t.occurred_at);
      if (day < f.range.from || day > f.range.to) return false;
    }
    if (f.type && t.type !== f.type) return false;
    if (f.walletId && t.wallet_id !== f.walletId && t.to_wallet_id !== f.walletId) return false;
    if (f.categoryId && t.category_id !== f.categoryId) return false;
    if (!q) return true;
    if (qAmount !== null && t.amount_paisa === qAmount) return true;
    if (t.note.toLowerCase().includes(q)) return true;
    const c = t.category_id ? categories.get(t.category_id) : undefined;
    return !!c && [c.name_bn, c.name_en].some((n) => n?.toLowerCase().includes(q));
  });
}
