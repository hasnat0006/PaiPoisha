/**
 * Budget writes (spec §5). Budgets are copied forward at read time; the first edit in a
 * month that has no rows of its own copies the carried-over rows into it first, so
 * changing November never changes October.
 */
import { db } from "@/db/db";
import { insertRow, updateRow } from "@/db/repo";
import type { Budget } from "@/db/types";
import { budgetsFor } from "@/lib/budgets";
import { isValidAmount, type Paisa } from "@/lib/money";

/** Make sure `month` has its own rows (copies of the carried-over ones). Returns them. */
async function ownRows(month: string): Promise<Budget[]> {
  const all = await db.budgets.toArray();
  const { rows, fromMonth } = budgetsFor(all, month);
  if (fromMonth === month || fromMonth === null) return rows;
  const copies: Budget[] = [];
  for (const r of rows) copies.push(await insertRow<Budget>("budgets", { category_id: r.category_id, month, limit_paisa: r.limit_paisa }));
  return copies;
}

/** Set (or change) the limit for a category, or the overall budget (`categoryId` null), in `month`. */
export async function setBudget(month: string, categoryId: string | null, limit: Paisa): Promise<void> {
  if (!isValidAmount(limit)) throw new Error("invalid-limit");
  await db.transaction("rw", db.budgets, async () => {
    const existing = (await ownRows(month)).find((b) => b.category_id === categoryId);
    if (existing) await updateRow<Budget>("budgets", existing.id, { limit_paisa: limit });
    else await insertRow<Budget>("budgets", { category_id: categoryId, month, limit_paisa: limit });
  });
}

/**
 * Remove a budget from `month` onwards (earlier months keep it). The row stays with limit 0,
 * meaning "no budget": deleting it could leave the month empty and bring back last month's set.
 */
export async function removeBudget(month: string, categoryId: string | null): Promise<void> {
  await db.transaction("rw", db.budgets, async () => {
    const row = (await ownRows(month)).find((b) => b.category_id === categoryId);
    if (row) await updateRow<Budget>("budgets", row.id, { limit_paisa: 0 });
  });
}
