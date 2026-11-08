import { describe, expect, it } from "vitest";
import type { Budget, Category, Transaction } from "@/db/types";
import type { EntriesData } from "../entries/useEntries";
import { budgetAlert } from "./budgetRows";

const now = new Date("2026-11-20T12:00:00+06:00");
const cat = (id: string, key: string | null = null) => ({ id, key, type: "expense" }) as Category;
const data = (budgets: Partial<Budget>[], entries: Partial<Transaction>[] = []): EntriesData => ({
  entries: entries as Transaction[],
  wallets: [],
  activeWallets: [],
  categories: [cat("food"), cat("bus"), cat("fees", "fees"), cat("adj", "adjustment")],
  budgets: budgets.map((b) => ({ month: "2026-11", deleted_at: null, ...b }) as Budget),
  settings: null,
  startDay: 1,
});
const entry = (o: Partial<Transaction>) =>
  ({ type: "expense", amount_paisa: 0, fee_paisa: 0, wallet_id: "w", to_wallet_id: null, category_id: "food", note: "", occurred_at: "2026-11-20T10:00:00+06:00", ...o }) as Transaction;

describe("budgetAlert", () => {
  it("warns when the saved expense takes its category budget near or over", () => {
    const d = data([{ category_id: "food", limit_paisa: 100000 }], [entry({ id: "a", amount_paisa: 70000 })]);
    expect(budgetAlert(d, entry({ amount_paisa: 5000 }), undefined, now)?.progress.status).toBe("near"); // 75%
    expect(budgetAlert(d, entry({ amount_paisa: 40000 }), undefined, now)?.progress.status).toBe("over");
  });

  it("stays quiet for another category, income, or a budget still under 75%", () => {
    const d = data([{ category_id: "food", limit_paisa: 100000 }]);
    expect(budgetAlert(d, entry({ category_id: "bus", amount_paisa: 99000 }), undefined, now)).toBeNull();
    expect(budgetAlert(d, entry({ type: "income", amount_paisa: 99000 }), undefined, now)).toBeNull();
    expect(budgetAlert(d, entry({ amount_paisa: 1000 }), undefined, now)).toBeNull();
  });

  it("counts a transfer fee against the fees and overall budgets, never the transfer amount", () => {
    const d = data([{ category_id: null, limit_paisa: 10000 }]); // overall ৳100
    const transfer = entry({ type: "transfer", category_id: null, to_wallet_id: "w2", amount_paisa: 500000, fee_paisa: 8000 });
    expect(budgetAlert(d, transfer, undefined, now)?.spent).toBe(8000);
    expect(budgetAlert(d, { ...transfer, fee_paisa: 0 }, undefined, now)).toBeNull();
  });

  it("replaces the edited entry instead of counting it twice", () => {
    const d = data([{ category_id: "food", limit_paisa: 100000 }], [entry({ id: "a", amount_paisa: 80000 })]);
    expect(budgetAlert(d, entry({ amount_paisa: 10000 }), "a", now)).toBeNull(); // edited down to ৳100
  });
});
