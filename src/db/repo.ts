/**
 * The only way UI code should create, change or delete rows.
 * These helpers stamp ids and timestamps and mark rows dirty for sync,
 * so no feature can forget to.
 */
import { db } from "./db";
import type { SyncFields, SyncedTable } from "./types";

type NewRow<T extends SyncFields> = Omit<T, keyof SyncFields>;

export const nowIso = () => new Date().toISOString();

/** UUID v4. randomUUID only exists on HTTPS/localhost, so phones on http://192.168.x.x need the fallback. */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function insertRow<T extends SyncFields>(table: SyncedTable, data: NewRow<T>): Promise<T> {
  const ts = nowIso();
  const row = {
    ...data,
    id: newId(),
    user_id: null,
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
    _dirty: 1,
  } as T;
  await db.table(table).add(row);
  return row;
}

export async function updateRow<T extends SyncFields>(
  table: SyncedTable,
  id: string,
  changes: Partial<NewRow<T>>,
): Promise<void> {
  await db.table(table).update(id, { ...changes, updated_at: nowIso(), _dirty: 1 });
}

/** Soft delete. Returns a function that undoes it (for the 5-second Undo bar). */
export async function softDelete(table: SyncedTable, id: string): Promise<() => Promise<void>> {
  await db.table(table).update(id, { deleted_at: nowIso(), updated_at: nowIso(), _dirty: 1 });
  return async () => {
    await db.table(table).update(id, { deleted_at: null, updated_at: nowIso(), _dirty: 1 });
  };
}
