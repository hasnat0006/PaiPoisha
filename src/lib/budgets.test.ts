import { describe, expect, it } from "vitest";
import { budgetProgress, budgetsFor } from "./budgets";
import { periodFromKey } from "./period";

const b = (month: string, category_id: string | null, limit_paisa: number, deleted_at: string | null = null) => ({
  month, category_id, limit_paisa, deleted_at,
});

describe("budgetsFor (copy-forward)", () => {
  const rows = [b("2026-09", "food", 500000), b("2026-09", null, 2000000), b("2026-11", "food", 600000)];

  it("uses the month's own rows when it has any", () => {
    expect(budgetsFor(rows, "2026-11")).toEqual({ rows: [rows[2]], fromMonth: "2026-11" });
  });

  it("uses the latest earlier month when the month has none, across a year too", () => {
    expect(budgetsFor(rows, "2026-10").fromMonth).toBe("2026-09");
    expect(budgetsFor(rows, "2027-02").fromMonth).toBe("2026-11");
  });

  it("returns nothing before the first budget, and ignores deleted rows", () => {
    expect(budgetsFor(rows, "2026-08")).toEqual({ rows: [], fromMonth: null });
    expect(budgetsFor([b("2026-10", "food", 1, "2026-10-02T00:00:00Z"), ...rows], "2026-10").fromMonth).toBe("2026-09");
  });
});

describe("budgetProgress", () => {
  const nov7 = periodFromKey("2026-11", 7); // 7 Nov → 6 Dec, Dhaka
  const now = new Date("2026-11-28T15:00:00+06:00");

  it("is ok under 75%, near from 75%, over from 100%", () => {
    expect(budgetProgress(74999, 100000, nov7, now).status).toBe("ok");
    expect(budgetProgress(75000, 100000, nov7, now).status).toBe("near");
    expect(budgetProgress(99999, 100000, nov7, now).status).toBe("near");
    expect(budgetProgress(100000, 100000, nov7, now).status).toBe("over");
  });

  it("gives the amount left or over", () => {
    expect(budgetProgress(30000, 150000, nov7, now).left).toBe(120000); // ৳1,200 left
    expect(budgetProgress(195000, 150000, nov7, now).left).toBe(-45000); // ৳450 over
  });

  it("counts days to go including today, only in the current period", () => {
    expect(budgetProgress(0, 1, nov7, now).daysLeft).toBe(9); // 28 Nov → 6 Dec
    expect(budgetProgress(0, 1, nov7, new Date("2026-12-06T23:00:00+06:00")).daysLeft).toBe(1);
    expect(budgetProgress(0, 1, nov7, new Date("2026-12-07T00:00:00+06:00")).daysLeft).toBeNull();
  });
});
