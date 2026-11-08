import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { activeBudgets } from "@/lib/budgets";
import { setMonthStartDay } from "../settings/settingsActions";
import { removeBudget, setBudget } from "./budgetActions";

const shown = async (month: string) =>
  activeBudgets(await db.budgets.toArray(), month)
    .map((b) => [b.category_id, b.limit_paisa])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]))); // "food" before null

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("budget writes", () => {
  it("carries a budget forward, and changing a later month leaves earlier ones alone", async () => {
    await setBudget("2026-09", "food", 500000); // ৳5,000
    await setBudget("2026-09", null, 2000000); // overall ৳20,000
    expect(await shown("2026-11")).toEqual([["food", 500000], [null, 2000000]]);

    await setBudget("2026-11", "food", 600000);
    expect(await shown("2026-11")).toEqual([["food", 600000], [null, 2000000]]); // overall copied in
    expect(await shown("2026-10")).toEqual([["food", 500000], [null, 2000000]]);
  });

  it("removing a month's only budget doesn't bring last month's back", async () => {
    await setBudget("2026-09", "food", 500000);
    await setBudget("2026-10", "food", 400000);
    await removeBudget("2026-10", "food");
    expect(await shown("2026-10")).toEqual([]);
    expect(await shown("2026-12")).toEqual([]);
    expect(await shown("2026-09")).toEqual([["food", 500000]]);
  });

  it("rejects a zero or over-max limit", async () => {
    await expect(setBudget("2026-09", "food", 0)).rejects.toThrow();
  });
});

describe("setMonthStartDay", () => {
  it("creates the settings row once, then updates it", async () => {
    await setMonthStartDay(7, "bn");
    await setMonthStartDay(25, "bn");
    const rows = await db.settings.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ month_start_day: 25, _dirty: 1 });
    await expect(setMonthStartDay(29, "bn")).rejects.toThrow();
  });
});
