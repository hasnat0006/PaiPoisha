import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { insertRow } from "@/db/repo";
import { ensureSeeded } from "@/db/seed";
import type { Transaction } from "@/db/types";
import { walletBalances } from "@/lib/balances";
import { addDemoData, autoAddDemoData, hasDemoData, removeDemoData } from "./demoData";

const NOW = new Date("2026-11-08T10:00:00+06:00");

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded("Cash");
});

describe("demo data (dev only)", () => {
  it("adds wallets, about three months of entries, transfers and this month's budgets, once", async () => {
    const added = await addDemoData(NOW);
    expect(added).toBeGreaterThan(100);
    expect(await addDemoData(NOW)).toBe(0); // a second tap adds nothing

    const txs = await db.transactions.toArray();
    expect(txs.every((t) => t.occurred_at <= NOW.toISOString())).toBe(true); // nothing in the future
    expect(txs.every((t) => Number.isInteger(t.amount_paisa) && t.amount_paisa > 0)).toBe(true);
    expect(txs.some((t) => t.type === "transfer" && t.fee_paisa === 9300)).toBe(true); // ৳93 cash-out fee
    expect(txs.some((t) => t.type === "income")).toBe(true);
    expect((await db.wallets.count())).toBe(4);
    expect((await db.budgets.toArray()).every((b) => b.month === "2026-11")).toBe(true);
    const balances = walletBalances(await db.wallets.toArray(), txs);
    expect([...balances.values()].every((b) => Number.isInteger(b) && b > 0)).toBe(true); // realistic: no wallet goes negative
  });

  it("removes exactly the demo rows and keeps the user's own", async () => {
    const [cash] = await db.wallets.toArray();
    const mine = await insertRow<Transaction>("transactions", {
      type: "expense", amount_paisa: 15000, wallet_id: cash.id, to_wallet_id: null, category_id: null, fee_paisa: 0, note: "", occurred_at: NOW.toISOString(),
    });
    await addDemoData(NOW);
    await removeDemoData();

    expect(await hasDemoData()).toBe(false);
    expect((await db.transactions.toArray()).map((t) => t.id)).toEqual([mine.id]);
    expect(await db.wallets.count()).toBe(1);
    expect(await db.budgets.count()).toBe(0);
  });

  it("fills a fresh dev database once; after Remove it stays removed", async () => {
    await Promise.all([autoAddDemoData(NOW), autoAddDemoData(NOW)]); // React dev mode runs effects twice
    expect(await hasDemoData()).toBe(true);
    const count = await db.transactions.count();
    await removeDemoData();
    await autoAddDemoData(NOW); // next app start
    expect(await hasDemoData()).toBe(false);
    expect(count).toBeGreaterThan(100);
  });

  it("leaves a database that already has the user's entries alone", async () => {
    const [cash] = await db.wallets.toArray();
    await insertRow<Transaction>("transactions", {
      type: "expense", amount_paisa: 15000, wallet_id: cash.id, to_wallet_id: null, category_id: null, fee_paisa: 0, note: "", occurred_at: NOW.toISOString(),
    });
    await autoAddDemoData(NOW);
    expect(await hasDemoData()).toBe(false);
  });
});
