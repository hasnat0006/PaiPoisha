import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { insertRow, newId, softDelete, updateRow } from "./repo";
import type { Wallet } from "./types";

const cash = {
  name: "Cash",
  kind: "cash",
  provider: null,
  opening_balance_paisa: 50000,
  color: "#16a34a",
  icon: "wallet",
  archived: false,
  sort_order: 0,
} as const;

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("repo", () => {
  it("insertRow stamps sync fields", async () => {
    const w = await insertRow<Wallet>("wallets", cash);
    expect(w.id).toMatch(/[0-9a-f-]{36}/);
    expect(w._dirty).toBe(1);
    expect(w.deleted_at).toBeNull();
    expect(await db.wallets.get(w.id)).toMatchObject({ name: "Cash" });
  });

  it("updateRow bumps updated_at and marks dirty", async () => {
    const w = await insertRow<Wallet>("wallets", cash);
    await db.wallets.update(w.id, { _dirty: 0 });
    await new Promise((r) => setTimeout(r, 5));
    await updateRow<Wallet>("wallets", w.id, { name: "Pocket cash" });
    const after = await db.wallets.get(w.id);
    expect(after?.name).toBe("Pocket cash");
    expect(after?._dirty).toBe(1);
    expect(after!.updated_at > w.updated_at).toBe(true);
  });

  it("softDelete can be undone", async () => {
    const w = await insertRow<Wallet>("wallets", cash);
    const undo = await softDelete("wallets", w.id);
    expect((await db.wallets.get(w.id))?.deleted_at).not.toBeNull();
    await undo();
    expect((await db.wallets.get(w.id))?.deleted_at).toBeNull();
  });
});

describe("newId", () => {
  it("makes a v4 UUID even where crypto.randomUUID is missing (plain-HTTP LAN dev)", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});
