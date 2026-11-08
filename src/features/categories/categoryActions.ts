/**
 * Category writes and their rules (spec §4): a custom category needs at least one
 * name; built-ins can't be deleted; a category with entries can only be hidden.
 */
import { db } from "@/db/db";
import { insertRow, softDelete, updateRow } from "@/db/repo";
import type { Category, CategoryType } from "@/db/types";
import { move, sortOrderChanges } from "@/lib/order";
import type { EntriesData } from "../entries/useEntries";

export const CATEGORY_NAME_MAX = 30;
export type CategoryFields = Pick<Category, "name_bn" | "name_en" | "icon" | "color">;

/** Trimmed names, empty -> null. Null if both are empty. */
export function cleanNames(f: Pick<Category, "name_bn" | "name_en">): Pick<Category, "name_bn" | "name_en"> | null {
  const clean = (s: string | null) => s?.trim().slice(0, CATEGORY_NAME_MAX) || null;
  const names = { name_bn: clean(f.name_bn), name_en: clean(f.name_en) };
  return names.name_bn || names.name_en ? names : null;
}

export const canDeleteCategory = (c: Category, data: EntriesData) =>
  !c.is_system && !data.entries.some((t) => t.category_id === c.id);

/** Categories shown on the Categories screen for one type, in order. "adjustment" is internal. */
export const listFor = (type: CategoryType, data: EntriesData) =>
  data.categories.filter((c) => c.type === type && c.key !== "adjustment");

export async function saveCategory(fields: CategoryFields, type: CategoryType, data: EntriesData, id?: string): Promise<void> {
  const names = cleanNames(fields);
  if (!names) throw new Error("name-required");
  const row = { ...fields, ...names };
  if (id) return updateRow<Category>("categories", id, row);
  const sort_order = Math.max(-1, ...listFor(type, data).map((c) => c.sort_order)) + 1;
  await insertRow<Category>("categories", { ...row, key: null, type, is_default: false, is_system: false, hidden: false, sort_order });
}

export const setHidden = (c: Category, hidden: boolean) => updateRow<Category>("categories", c.id, { hidden });

export async function deleteCategory(c: Category, data: EntriesData): Promise<void> {
  if (!canDeleteCategory(c, data)) throw new Error("category-in-use");
  await softDelete("categories", c.id);
}

export async function moveCategory(list: Category[], index: number, dir: -1 | 1): Promise<void> {
  const changes = sortOrderChanges(move(list, index, dir));
  await db.transaction("rw", db.categories, () =>
    Promise.all(changes.map((c) => updateRow<Category>("categories", c.id, { sort_order: c.sort_order }))),
  );
}
