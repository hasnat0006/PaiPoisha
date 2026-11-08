/**
 * One sync cycle (spec §10): push dirty rows, then pull rows changed on the server.
 * On the first sync of an account on this phone it merges the phone's data in (spec §1).
 * No React, no timers: runner.ts decides when to call `syncOnce`.
 */
import { db } from "@/db/db";
import { SYNCED_TABLES, type Category, type Settings, type SyncFields, type SyncedTable } from "@/db/types";
import type { Cursor, Remote, RemoteRow } from "./remote";
import type { MergeResult } from "./status";

export const BATCH = 500;
const OWNER_KEY = "user_id"; // meta: the account this phone's data belongs to
const cursorKey = (t: SyncedTable) => `pull:${t}`;
const TIME_FIELDS = ["created_at", "updated_at", "deleted_at", "occurred_at"];

type Row = SyncFields & Record<string, unknown>;
const table = (t: SyncedTable) => db.table<Row, string>(t);

/** Upload every dirty row. A row edited while its batch was in flight stays dirty for the next cycle. */
export async function push(remote: Remote, uid: string): Promise<void> {
  for (const t of SYNCED_TABLES) {
    const dirty = await table(t).where("_dirty").equals(1).toArray();
    for (let i = 0; i < dirty.length; i += BATCH) {
      const batch = dirty.slice(i, i + BATCH);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- _dirty is local only: dropped before upload
      await remote.upsert(t, batch.map(({ _dirty, ...r }) => ({ ...r, user_id: uid })));
      await db.transaction("rw", table(t), async () => {
        const now = await table(t).bulkGet(batch.map((r) => r.id));
        const unchanged = batch.filter((sent, j) => now[j]?.updated_at === sent.updated_at);
        await table(t).bulkUpdate(unchanged.map((r) => ({ key: r.id, changes: { _dirty: 0, user_id: uid } })));
      });
    }
  }
}

/** Server timestamps ("…12.345678+00:00") → the app's format ("…12.345Z"), so string comparisons hold. */
function toLocal(raw: RemoteRow): Row {
  const row: Record<string, unknown> = { ...raw };
  for (const f of TIME_FIELDS) if (typeof row[f] === "string") row[f] = new Date(row[f] as string).toISOString();
  return { ...(row as Row), _dirty: 0 };
}

/** Download rows changed since this table's cursor. The cursor holds the server's own values, never the phone's clock. */
export async function pull(remote: Remote): Promise<void> {
  for (const t of SYNCED_TABLES) {
    const saved = await db.meta.get(cursorKey(t));
    let cursor: Cursor | null = saved ? JSON.parse(saved.value) : null;
    for (;;) {
      const rows = await remote.pullPage(t, cursor, BATCH);
      if (rows.length === 0) break;
      const last = rows[rows.length - 1];
      cursor = { updated_at: last.updated_at, id: last.id };
      await db.transaction("rw", table(t), db.meta, async () => {
        const incoming = rows.map(toLocal);
        const locals = await table(t).bulkGet(incoming.map((r) => r.id));
        // Skip a row this phone changed later; that edit uploads next.
        await table(t).bulkPut(incoming.filter((row, j) => !(locals[j]?._dirty && locals[j].updated_at > row.updated_at)));
        await db.meta.put({ key: cursorKey(t), value: JSON.stringify(cursor) });
      });
      if (rows.length < BATCH) break;
    }
  }
}

/**
 * First sync of an account on this phone. Rows never uploaded have `user_id` null.
 * The phone's own copies of the default categories, an untouched Cash wallet and its
 * settings row give way to the account's, so a second phone doesn't show everything twice.
 * Deleting those rows outright is safe: they never reached the server.
 */
export async function mergeAccount(remote: Remote): Promise<MergeResult> {
  await pull(remote);
  return db.transaction("rw", [db.wallets, db.categories, db.transactions, db.budgets, db.settings], async () => {
    const local = <T extends SyncFields>(rows: T[]) => rows.filter((r) => r.user_id === null);
    const cloud = <T extends SyncFields>(rows: T[]) => rows.filter((r) => r.user_id !== null && !r.deleted_at);

    const categories = await db.categories.toArray();
    const cloudByKey = new Map(cloud(categories).filter((c) => c.key).map((c) => [c.key, c] as const));
    for (const c of local(categories)) {
      const twin: Category | undefined = c.key ? cloudByKey.get(c.key) : undefined;
      if (!twin) continue;
      await db.transactions.where("category_id").equals(c.id).modify({ category_id: twin.id });
      await db.budgets.filter((b) => b.category_id === c.id).modify({ category_id: twin.id });
      await db.categories.delete(c.id);
    }

    const wallets = await db.wallets.toArray();
    const hadCloud = cloud(wallets).length > 0;
    if (hadCloud) {
      for (const w of local(wallets)) {
        if (w.kind !== "cash" || w.opening_balance_paisa !== 0) continue;
        const used = await db.transactions.filter((x) => x.wallet_id === w.id || x.to_wallet_id === w.id).count();
        if (used === 0) await db.wallets.delete(w.id);
      }
    }

    const settings = await db.settings.toArray();
    const account: Settings | null = cloud(settings).sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? null;
    if (account) await db.settings.bulkDelete(local(settings).map((s) => s.id));

    const added = local(await db.transactions.toArray()).filter((x) => !x.deleted_at).length;
    return { added, hadCloud, settings: account };
  });
}

export type SyncResult = { signedIn: false } | { signedIn: true; email: string | null; merged: MergeResult | null };

/**
 * Push, then pull (spec §10). Throws on any network or server error; the caller retries.
 * `known` is the user the caller already read (skips a second session read).
 */
export async function syncOnce(remote: Remote, known?: Awaited<ReturnType<Remote["user"]>>): Promise<SyncResult> {
  const user = known === undefined ? await remote.user() : known;
  if (!user) return { signedIn: false };
  const owner = await db.meta.get(OWNER_KEY);
  const merged = owner?.value === user.id ? null : await mergeAccount(remote);
  await push(remote, user.id);
  // Recorded only after the upload: if it fails, the next try merges again (it is idempotent).
  if (merged) await db.meta.put({ key: OWNER_KEY, value: user.id });
  await pull(remote);
  return { signedIn: true, email: user.email, merged };
}

/** Rows waiting to upload, for "4 changes will sync later". */
export async function pendingCount(): Promise<number> {
  const counts = await Promise.all(SYNCED_TABLES.map((t) => table(t).where("_dirty").equals(1).count()));
  return counts.reduce((a, b) => a + b, 0);
}
