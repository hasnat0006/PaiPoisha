/**
 * Demo data for development only (user, 2026-11-08): three more wallets, about three months of entries,
 * cash-out transfers with fees, and this month's budgets, so every screen has something to show.
 * Under `npm run dev` (which has no Supabase keys) a fresh database gets it automatically; the More tab adds or
 * removes it, only while signed out (it would upload otherwise). Production builds never include this file.
 * Rows are written through repo.ts like real ones; their ids are kept in meta so Remove deletes exactly them.
 */
import { db } from "@/db/db";
import { insertRow, softDelete } from "@/db/repo";
import type { Budget, Category, SyncedTable, Transaction, TransactionType, Wallet } from "@/db/types";
import { PRESETS } from "@/features/wallets/presets";
import { DEFAULT_START_DAY, getPeriod } from "@/lib/period";

const META_KEY = "demo_rows";
const AUTO_KEY = "demo_auto"; // set once the dev database has been offered the demo set
const DAYS = 90;
const tk = (taka: number) => Math.round(taka) * 100; // whole taka → paisa

type Ref = { table: SyncedTable; id: string };

/** Same numbers on every run, so screenshots and bug reports match. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fills a fresh dev database with the demo set, once (user, 2026-11-09: the dev server shows dummy data, production
 * never does). Skipped if the database already has entries; once removed in More, it stays removed.
 */
export async function autoAddDemoData(now = new Date()): Promise<void> {
  const first = await db.transaction("rw", db.meta, async () => {
    if (await db.meta.get(AUTO_KEY)) return false; // two calls at once (React dev mode): only one goes on
    await db.meta.put({ key: AUTO_KEY, value: now.toISOString() });
    return true;
  });
  if (first && (await db.transactions.count()) === 0) await addDemoData(now);
}

export async function hasDemoData(): Promise<boolean> {
  return !!(await db.meta.get(META_KEY));
}

/** Adds the demo set (once). Needs the seeded Cash wallet and default categories. Returns rows added. */
export async function addDemoData(now = new Date()): Promise<number> {
  if (await hasDemoData()) return 0;
  const cats = (await db.categories.toArray()).filter((c) => !c.deleted_at);
  const cat = (key: string) => cats.find((c) => c.key === key)?.id ?? null;
  const cash = (await db.wallets.toArray()).find((w) => !w.deleted_at && w.kind === "cash");
  if (!cash || !cat("groceries")) throw new Error("not-seeded");

  const refs: Ref[] = [];
  const rnd = random(20261108);
  const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

  await db.transaction("rw", [db.wallets, db.transactions, db.budgets, db.settings, db.meta], async () => {
    const wallet = async (name: string, preset: keyof typeof PRESETS, opening: number, sort_order: number) => {
      const w = await insertRow<Wallet>("wallets", { name, ...PRESETS[preset], opening_balance_paisa: tk(opening), archived: false, sort_order });
      refs.push({ table: "wallets", id: w.id });
      return w.id;
    };
    const bkash = await wallet("bKash", "bkash", 2500, 1);
    const nagad = await wallet("Nagad", "nagad", 800, 2);
    const bank = await wallet("DBBL", "bank", 25000, 3);

    const add = async (daysAgo: number, type: TransactionType, taka: number, wallet_id: string, category: string | null, note = "", extra: Partial<Transaction> = {}) => {
      const at = new Date(now.getTime() - daysAgo * 86_400_000);
      at.setUTCHours(6, between(0, 59), 0, 0); // 12:xx in Dhaka: the same calendar day everywhere
      if (at > now) at.setTime(now.getTime()); // today's entries never land later than now
      const tx = await insertRow<Transaction>("transactions", {
        type, amount_paisa: tk(taka), wallet_id, to_wallet_id: null, category_id: category && cat(category), fee_paisa: 0, note,
        occurred_at: at.toISOString(), ...extra,
      });
      refs.push({ table: "transactions", id: tx.id });
    };

    for (let d = DAYS; d >= 0; d--) {
      const day = new Date(now.getTime() - d * 86_400_000).getUTCDate();
      if (day === 1) await add(d, "income", 35000, bank, "salary", "বেতন");
      if (day === 3) await add(d, "expense", 12000, bank, "rent");
      if (day === 7) await add(d, "expense", between(1200, 1900), bkash, "electricity");
      if (day === 8) await add(d, "expense", 1050, bkash, "internet");
      if (day === 10) await add(d, "expense", 5000, bkash, "family", "আম্মুকে");
      if (day === 15) await add(d, "income", 5000, bkash, "tuition");
      if (day === 20) await add(d, "expense", 1080, cash.id, "gas");
      // Money moves like it does in real life: salary goes on to bKash and Nagad, and bKash is cashed out
      // four times a month (৳5,000 at bKash's 1.85% fee = ৳93), so every wallet stays positive.
      if (day === 2) await add(d, "transfer", 25000, bank, null, "", { to_wallet_id: bkash });
      if (day === 2) await add(d, "transfer", 2000, bank, null, "", { to_wallet_id: nagad });
      if (day === 2 || day === 9 || day === 16 || day === 23) {
        await add(d, "transfer", 5000, bkash, null, "ক্যাশ আউট", { to_wallet_id: cash.id, fee_paisa: tk(93) });
      }
      if (rnd() < 0.45) await add(d, "expense", between(150, 1400), cash.id, "groceries");
      if (rnd() < 0.7) await add(d, "expense", between(30, 250), rnd() < 0.7 ? cash.id : bkash, "transport", rnd() < 0.5 ? "রিকশা" : "বাস");
      if (rnd() < 0.2) await add(d, "expense", between(180, 900), rnd() < 0.5 ? cash.id : nagad, "eating_out");
      if (rnd() < 0.07) await add(d, "expense", between(100, 500), nagad, "mobile_recharge");
      if (rnd() < 0.04) await add(d, "expense", between(300, 2500), cash.id, "medical");
    }

    // This period's budgets (skipping any the user already set), one near its limit and one over.
    const setting = (await db.settings.toArray()).find((s) => !s.deleted_at);
    const month = getPeriod(now, setting?.month_start_day ?? DEFAULT_START_DAY).key;
    const taken = new Set((await db.budgets.toArray()).filter((b) => b.month === month && !b.deleted_at).map((b) => b.category_id));
    const budgets: [string | null, number][] = [[null, 40000], [cat("groceries"), 6000], [cat("transport"), 1500], [cat("eating_out"), 3000]];
    for (const [category_id, limit] of budgets) {
      if (taken.has(category_id)) continue;
      const b = await insertRow<Budget>("budgets", { category_id, month, limit_paisa: tk(limit) });
      refs.push({ table: "budgets", id: b.id });
    }
    await db.meta.put({ key: META_KEY, value: JSON.stringify(refs) });
  });
  return refs.length;
}

/** Removes exactly the demo rows: never-uploaded ones outright, any that synced by soft delete (so the delete syncs too). */
export async function removeDemoData(): Promise<void> {
  const saved = await db.meta.get(META_KEY);
  if (!saved) return;
  const refs: Ref[] = JSON.parse(saved.value);
  // Children first, so no entry is ever left pointing at a removed wallet.
  for (const table of ["budgets", "transactions", "wallets"] as const) {
    for (const { id } of refs.filter((r) => r.table === table)) {
      const row = await db.table<Category | Transaction | Wallet | Budget, string>(table).get(id);
      if (!row) continue;
      if (row.user_id === null) await db.table(table).delete(id);
      else if (!row.deleted_at) await softDelete(table, id);
    }
  }
  await db.meta.delete(META_KEY);
}
