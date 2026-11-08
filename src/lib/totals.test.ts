import { describe, expect, it } from "vitest";
import { periodTotals, spendingByCategory, topWithOthers } from "./totals";

const ctx = { adjustmentId: "adj", feesId: "fees" };
const e = (category_id: string, amount_paisa: number) => ({ type: "expense" as const, amount_paisa, fee_paisa: 0, category_id });
const i = (category_id: string, amount_paisa: number) => ({ type: "income" as const, amount_paisa, fee_paisa: 0, category_id });
const tr = (amount_paisa: number, fee_paisa = 0) => ({ type: "transfer" as const, amount_paisa, fee_paisa, category_id: null });

describe("periodTotals", () => {
  it("is all zero with no entries", () => {
    expect(periodTotals([], ctx)).toEqual({ income: 0, spent: 0, net: 0 });
  });

  it("counts transfer fees as spent and leaves out transfer amounts and adjustments", () => {
    const t = periodTotals([tr(100000, 1850), e("adj", 5000), i("adj", 7000), e("food", 2000)], ctx);
    expect(t).toEqual({ income: 0, spent: 3850, net: -3850 }); // ৳18.50 fee + ৳20 food
  });

  it("matches a hand calculation on 30 mixed entries (spec §6 Done when)", () => {
    const txs = [
      // 12 expenses: 150+80+1200+45.50+300+60+15000+220+99.99+500+35+1000 = ৳18,690.49
      e("groceries", 15000), e("transport", 8000), e("rent", 120000), e("transport", 4550), e("eating", 30000),
      e("transport", 6000), e("rent", 1500000), e("groceries", 22000), e("mobile", 9999), e("medical", 50000),
      e("transport", 3500), e("eating", 100000),
      // 6 income: 45000+8000+12000.50+3000+500+150 = ৳68,650.50
      i("salary", 4500000), i("tuition", 800000), i("freelance", 1200050), i("tuition", 300000), i("other", 50000), i("other", 15000),
      // 6 transfers, fees 18.50+0+9.25+0+37+0 = ৳64.75 (amounts ignored)
      tr(100000, 1850), tr(500000), tr(50000, 925), tr(20000), tr(200000, 3700), tr(1000),
      // 6 adjustments, all ignored
      e("adj", 1000), i("adj", 2000), e("adj", 300), i("adj", 99999), e("adj", 5), i("adj", 1),
    ];
    expect(txs).toHaveLength(30);
    const spent = 1869049 + 6475; // ৳18,690.49 + ৳64.75 fees = ৳18,755.24
    const income = 6865050; // ৳68,650.50
    expect(periodTotals(txs, ctx)).toEqual({ income, spent, net: income - spent });
  });
});

describe("spendingByCategory", () => {
  it("groups expenses, puts fees under the fees category, biggest first", () => {
    const rows = spendingByCategory([e("food", 1000), e("bus", 3000), e("food", 500), tr(50000, 1850), i("salary", 9), e("adj", 99)], ctx);
    expect(rows).toEqual([
      { categoryId: "bus", spent: 3000 },
      { categoryId: "fees", spent: 1850 },
      { categoryId: "food", spent: 1500 },
    ]);
  });
});

describe("topWithOthers", () => {
  it("keeps the top 5 and sums the rest", () => {
    const rows = [9, 8, 7, 6, 5, 4, 3].map((spent, n) => ({ categoryId: String(n), spent }));
    const { top, others } = topWithOthers(rows);
    expect(top).toHaveLength(5);
    expect(others).toBe(7);
  });
});
