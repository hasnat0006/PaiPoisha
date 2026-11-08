import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { softDelete } from "./repo";
import { ensureSeeded } from "./seed";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("ensureSeeded", () => {
  it("creates one cash wallet and the default categories, marked dirty", async () => {
    await ensureSeeded("ক্যাশ");
    const wallets = await db.wallets.toArray();
    expect(wallets).toHaveLength(1);
    expect(wallets[0]).toMatchObject({ name: "ক্যাশ", kind: "cash", _dirty: 1 });
    const cats = await db.categories.toArray();
    const keys = cats.map((c) => c.key);
    expect(keys).toEqual(expect.arrayContaining(["groceries", "salary", "other_expense", "other_income", "fees", "adjustment"]));
    expect(cats.filter((c) => c.is_system).map((c) => c.key).sort()).toEqual(["adjustment", "fees", "other_expense", "other_income"]);
  });

  it("does nothing the second time, even when run in parallel", async () => {
    await Promise.all([ensureSeeded("Cash"), ensureSeeded("Cash")]);
    await ensureSeeded("Cash");
    expect(await db.wallets.count()).toBe(1);
    expect(await db.categories.count()).toBe(18);
  });

  it("doesn't bring the wallet back after it was deleted", async () => {
    await ensureSeeded("Cash");
    const [w] = await db.wallets.toArray();
    await softDelete("wallets", w.id);
    await ensureSeeded("Cash");
    expect(await db.wallets.count()).toBe(1);
  });
});
