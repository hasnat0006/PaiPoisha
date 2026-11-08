import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { insertRow } from "@/db/repo";
import { ensureSeeded } from "@/db/seed";
import type { Transaction } from "@/db/types";
import { walletBalances } from "@/lib/balances";
import { deleteCategory, saveCategory, setHidden } from "../categories/categoryActions";
import type { EntriesData } from "../entries/useEntries";
import { adjustBalance, canArchive, canDelete, deleteWallet, moveWallet, saveWallet, setArchived } from "./walletActions";

/** Same shape the useEntries hook builds. */
async function load(): Promise<EntriesData> {
  const live = <T extends { deleted_at: string | null }>(r: T[]) => r.filter((x) => !x.deleted_at);
  const wallets = live(await db.wallets.orderBy("sort_order").toArray());
  return {
    entries: live(await db.transactions.toArray()),
    wallets,
    activeWallets: wallets.filter((w) => !w.archived),
    categories: live(await db.categories.orderBy("sort_order").toArray()),
    budgets: [],
    settings: null,
    startDay: 1,
  };
}

const bkash = { name: " bKash ", kind: "mfs", provider: "bkash", opening_balance_paisa: 50000, color: "#e2136e", icon: "smartphone" } as const;

const spend = (wallet_id: string, category_id: string, amount_paisa: number) =>
  insertRow<Transaction>("transactions", {
    type: "expense", amount_paisa, wallet_id, to_wallet_id: null, category_id, fee_paisa: 0, note: "", occurred_at: "2026-11-07T10:00:00+06:00",
  });

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded("Cash");
});

describe("wallet rules", () => {
  it("adds a wallet at the end, trimmed", async () => {
    await saveWallet({ ...bkash }, await load());
    const d = await load();
    expect(d.activeWallets.map((w) => w.name)).toEqual(["Cash", "bKash"]);
  });

  it("stores only wallet fields, never the form's own (its 'opening' text box blocked sync)", async () => {
    await saveWallet({ ...bkash, opening: "500" } as typeof bkash, await load());
    expect((await load()).wallets[1]).not.toHaveProperty("opening");
  });

  it("drops the provider for non-mobile-banking wallets", async () => {
    await saveWallet({ ...bkash, kind: "bank" }, await load());
    expect((await load()).wallets[1].provider).toBeNull();
  });

  it("never archives or deletes the last active wallet", async () => {
    const d = await load();
    const [cash] = d.wallets;
    expect(canArchive(cash, d)).toBe(false);
    expect(canDelete(cash, d)).toBe(false);
    await expect(setArchived(cash, true, d)).rejects.toThrow();
  });

  it("archives a wallet with entries but won't delete it", async () => {
    await saveWallet({ ...bkash }, await load());
    let d = await load();
    const w = d.wallets[1];
    await spend(w.id, d.categories[0].id, 1000);
    d = await load();
    expect(canDelete(w, d)).toBe(false);
    await expect(deleteWallet(w, d)).rejects.toThrow();
    await setArchived(w, true, d);
    d = await load();
    expect(d.activeWallets).toHaveLength(1);
    expect(d.wallets).toHaveLength(2); // still there for history
  });

  it("soft-deletes an unused wallet", async () => {
    await saveWallet({ ...bkash }, await load());
    const d = await load();
    await deleteWallet(d.wallets[1], d);
    expect((await load()).wallets).toHaveLength(1);
    expect(await db.wallets.count()).toBe(2); // row kept with deleted_at, for sync
  });

  it("adjusts the balance up and down with an adjustment entry", async () => {
    let d = await load();
    const cash = d.wallets[0];
    await spend(cash.id, d.categories[0].id, 15000); // ৳150 → balance −৳150
    d = await load();
    const app = walletBalances(d.wallets, d.entries).get(cash.id)!;
    expect(await adjustBalance(cash, app, 20000, d)).toBe(true); // real ৳200
    d = await load();
    expect(walletBalances(d.wallets, d.entries).get(cash.id)).toBe(20000);
    const adj = d.entries.find((t) => t.type === "income")!;
    expect(d.categories.find((c) => c.id === adj.category_id)?.key).toBe("adjustment");
    expect(await adjustBalance(cash, 20000, 20000, d)).toBe(false);
  });

  it("reorders wallets", async () => {
    await saveWallet({ ...bkash }, await load());
    await moveWallet((await load()).activeWallets, 1, -1);
    expect((await load()).activeWallets.map((w) => w.name)).toEqual(["bKash", "Cash"]);
  });
});

describe("category rules", () => {
  it("needs at least one name for a custom category", async () => {
    await expect(saveCategory({ name_bn: " ", name_en: "", icon: "circle", color: "#000" }, "expense", await load())).rejects.toThrow();
    await saveCategory({ name_bn: null, name_en: "Gym", icon: "circle", color: "#000" }, "expense", await load());
    expect((await load()).categories.find((c) => c.name_en === "Gym")).toMatchObject({ name_bn: null, is_system: false, type: "expense" });
  });

  it("won't delete a built-in or a used category, but hides it", async () => {
    let d = await load();
    const groceries = d.categories.find((c) => c.key === "groceries")!;
    const other = d.categories.find((c) => c.key === "other_expense")!;
    await spend(d.wallets[0].id, groceries.id, 1000);
    d = await load();
    await expect(deleteCategory(groceries, d)).rejects.toThrow();
    await expect(deleteCategory(other, d)).rejects.toThrow();
    await setHidden(groceries, true);
    expect((await load()).categories.find((c) => c.id === groceries.id)?.hidden).toBe(true);
  });
});
