import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { insertRow, softDelete, updateRow } from "@/db/repo";
import { ensureSeeded } from "@/db/seed";
import type { Category, Settings, Transaction, Wallet } from "@/db/types";
import { BATCH, pendingCount, pull, push, syncOnce } from "./engine";
import { fakeRemote } from "./fakeRemote";

const wallet = (name = "bKash") =>
  insertRow<Wallet>("wallets", { name, kind: "mfs", provider: "bkash", opening_balance_paisa: 0, color: "#e2136e", icon: "wallet", archived: false, sort_order: 1 });

const entry = (wallet_id: string, category_id: string | null, amount_paisa = 15000 /* ৳150 */) =>
  insertRow<Transaction>("transactions", { type: "expense", amount_paisa, wallet_id, to_wallet_id: null, category_id, fee_paisa: 0, note: "", occurred_at: "2026-11-07T10:00:00.000Z" });

/** A second phone: same account and server, an empty local database. */
async function newPhone() {
  await db.delete();
  await db.open();
}

beforeEach(newPhone);

describe("push", () => {
  it("uploads dirty rows with the user's id and marks them clean", async () => {
    const { remote, rowsOf } = fakeRemote();
    const w = await wallet();
    await push(remote, "u1");
    const sent = rowsOf("wallets").get(w.id)!;
    expect(sent.user_id).toBe("u1");
    expect(sent).not.toHaveProperty("_dirty"); // local-only field never leaves the phone
    expect((await db.wallets.get(w.id))!._dirty).toBe(0);
    expect(await pendingCount()).toBe(0);
  });

  it("keeps a row dirty when it is edited while its upload is in flight", async () => {
    const { remote } = fakeRemote();
    const w = await wallet();
    remote.beforeUpsert = async () => {
      await new Promise((r) => setTimeout(r, 5)); // the edit gets a later timestamp
      await updateRow<Wallet>("wallets", w.id, { name: "bKash personal" });
      remote.beforeUpsert = undefined;
    };
    await push(remote, "u1");
    expect((await db.wallets.get(w.id))!._dirty).toBe(1);
  });

  it("uploads in batches of 500", async () => {
    const { remote, upserts } = fakeRemote();
    const w = await wallet();
    await db.transactions.bulkAdd(
      Array.from({ length: BATCH * 2 + 1 }, (_, i) => ({
        id: `t${String(i).padStart(4, "0")}`, user_id: null, created_at: "2026-11-07T10:00:00.000Z", updated_at: "2026-11-07T10:00:00.000Z", deleted_at: null, _dirty: 1 as const,
        type: "expense" as const, amount_paisa: 100, wallet_id: w.id, to_wallet_id: null, category_id: null, fee_paisa: 0, note: "", occurred_at: "2026-11-07T10:00:00.000Z",
      })),
    );
    await push(remote, "u1");
    expect(upserts.filter((u) => u.table === "transactions").map((u) => u.count)).toEqual([500, 500, 1]);
  });
});

describe("pull", () => {
  it("pages through more than 500 rows, including rows that share one server timestamp", async () => {
    const { remote, rowsOf } = fakeRemote();
    const w = await wallet();
    const rows = Array.from({ length: 1201 }, (_, i) => ({ id: `t${String(i).padStart(4, "0")}`, updated_at: "2026-11-08T04:00:00.000123+00:00", deleted_at: null, wallet_id: w.id }));
    rows.forEach((r) => rowsOf("transactions").set(r.id, r));
    await pull(remote);
    expect(await db.transactions.count()).toBe(1201);
  });

  it("saves the server's timestamp as the pull position, not the phone's clock", async () => {
    const { remote } = fakeRemote();
    await wallet();
    await push(remote, "u1");
    await pull(remote);
    const cursor = JSON.parse((await db.meta.get("pull:wallets"))!.value);
    expect(cursor.updated_at).toBe("2026-11-08T04:00:01.000123+00:00");
    expect((await db.wallets.toArray())[0].updated_at).toBe("2026-11-08T04:00:01.000Z"); // stored in the app's format
  });

  it("does not overwrite a local row that is dirty and newer", async () => {
    const { remote, rowsOf } = fakeRemote();
    const w = await wallet();
    await push(remote, "u1");
    rowsOf("wallets").set(w.id, { ...rowsOf("wallets").get(w.id)!, name: "From other phone", updated_at: "2020-01-01T00:00:00.000000+00:00" });
    await updateRow<Wallet>("wallets", w.id, { name: "Edited here" });
    await pull(remote);
    expect((await db.wallets.get(w.id))!.name).toBe("Edited here");
  });

  it("brings deletes from another phone", async () => {
    const { remote } = fakeRemote();
    const w = await wallet();
    const tx = await entry(w.id, null);
    await syncOnce(remote);
    await softDelete("transactions", tx.id);
    await syncOnce(remote);

    await newPhone();
    await syncOnce(remote);
    expect((await db.transactions.get(tx.id))!.deleted_at).not.toBeNull();
  });
});

describe("first sync of an account on a phone (spec §1 merge)", () => {
  it("shows an entry made offline on the first phone on a second phone, without doubled defaults", async () => {
    const { remote } = fakeRemote();
    // Phone A: used offline before signing in
    await ensureSeeded("Cash");
    const [cashA] = await db.wallets.toArray();
    const groceriesA = (await db.categories.where("key").equals("groceries").first())!;
    const tx = await entry(cashA.id, groceriesA.id);
    expect((await syncOnce(remote)).signedIn).toBe(true);

    // Phone B: seeded its own defaults and made one entry before signing in
    await newPhone();
    await ensureSeeded("Cash");
    const groceriesB = (await db.categories.where("key").equals("groceries").first())!;
    const cashB = (await db.wallets.toArray())[0];
    const txB = await entry(cashB.id, groceriesB.id, 5000);
    const res = await syncOnce(remote);

    expect(res.signedIn && res.merged).toMatchObject({ added: 1, hadCloud: true });
    expect((await db.transactions.get(tx.id))!.amount_paisa).toBe(15000);
    const groceries = await db.categories.where("key").equals("groceries").toArray();
    expect(groceries.map((c) => c.id)).toEqual([groceriesA.id]); // B's copy merged into A's
    expect((await db.transactions.get(txB.id))!.category_id).toBe(groceriesA.id);
    expect((await db.wallets.toArray()).length).toBe(2); // B's Cash has an entry, so it is kept
  });

  it("drops the second phone's untouched Cash wallet and settings in favour of the account's", async () => {
    const { remote } = fakeRemote();
    await ensureSeeded("Cash");
    await insertRow<Settings>("settings", { language: "en", bangla_digits: false, theme: "dark", month_start_day: 5 });
    await syncOnce(remote);

    await newPhone();
    await ensureSeeded("ক্যাশ");
    await insertRow<Settings>("settings", { language: "bn", bangla_digits: true, theme: "system", month_start_day: 1 });
    const res = await syncOnce(remote);

    expect(res.signedIn && res.merged && res.merged.settings).toMatchObject({ language: "en", theme: "dark", month_start_day: 5 });
    expect((await db.wallets.toArray()).map((w) => w.name)).toEqual(["Cash"]);
    expect(await db.settings.count()).toBe(1);
    expect(await pendingCount()).toBe(0);
  });

  it("merges only once per account", async () => {
    const { remote } = fakeRemote();
    await ensureSeeded("Cash");
    const first = await syncOnce(remote);
    const second = await syncOnce(remote);
    expect(first.signedIn && first.merged).toBeTruthy();
    expect(second.signedIn && second.merged).toBeNull();
  });

  it("does nothing when signed out", async () => {
    const { remote, upserts } = fakeRemote(null);
    await wallet();
    expect(await syncOnce(remote)).toEqual({ signedIn: false });
    expect(upserts).toHaveLength(0);
  });
});

it("keeps categories in the user's account intact after the merge", async () => {
  const { remote, rowsOf } = fakeRemote();
  await ensureSeeded("Cash");
  await syncOnce(remote);
  const before = rowsOf("categories").size;
  await newPhone();
  await ensureSeeded("Cash");
  await syncOnce(remote);
  expect(rowsOf("categories").size).toBe(before); // no duplicates uploaded
  const keys = (await db.categories.toArray()).map((c: Category) => c.key);
  expect(new Set(keys).size).toBe(keys.length);
});
