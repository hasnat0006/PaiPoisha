import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { ensureSeeded } from "@/db/seed";
import { saveCategoryOrder } from "./categoryActions";

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded("Cash");
});

describe("saveCategoryOrder", () => {
  it("saves a dragged order and writes only the rows that moved", async () => {
    const list = (await db.categories.where("type").equals("income").sortBy("sort_order"))!; // salary, tuition, freelance, other_income
    await db.categories.toCollection().modify({ _dirty: 0 });
    const dragged = [list[2], list[0], list[1], list[3]]; // freelance dragged to the top
    await saveCategoryOrder(dragged);

    const after = await db.categories.where("type").equals("income").sortBy("sort_order");
    expect(after.map((c) => c.key)).toEqual(["freelance", "salary", "tuition", "other_income"]);
    expect(after.filter((c) => c._dirty === 1).map((c) => c.key)).toEqual(["freelance", "salary", "tuition"]); // other_income kept its place
  });
});
