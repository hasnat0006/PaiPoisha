/**
 * Test double for Supabase: an in-memory server that, like the real trigger, stamps
 * updated_at itself (in Postgres' "+00:00" microsecond format) and pages by (updated_at, id).
 */
import type { SyncedTable } from "@/db/types";
import type { Cursor, Remote, RemoteRow } from "./remote";

export function fakeRemote(user: { id: string; email: string | null } | null = { id: "u1", email: "a@example.com" }) {
  const tables = new Map<SyncedTable, Map<string, RemoteRow>>();
  let tick = Date.parse("2026-11-08T04:00:00Z");
  const serverNow = () => new Date((tick += 1000)).toISOString().replace("Z", "123+00:00"); // e.g. …:01.000123+00:00
  const rowsOf = (t: SyncedTable) => tables.get(t) ?? tables.set(t, new Map()).get(t)!;
  const upserts: { table: SyncedTable; count: number }[] = [];

  const remote: Remote & { beforeUpsert?: () => Promise<void> | void } = {
    async user() {
      return user;
    },
    async upsert(t, rows) {
      await remote.beforeUpsert?.();
      upserts.push({ table: t, count: rows.length });
      const now = serverNow(); // one statement, one now(): the whole batch shares a timestamp
      for (const r of rows) rowsOf(t).set(r.id as string, { ...r, updated_at: now } as RemoteRow);
    },
    async pullPage(t, after: Cursor | null, limit) {
      const key = (r: { updated_at: string; id: string }) => `${r.updated_at}|${r.id}`;
      return [...rowsOf(t).values()]
        .filter((r) => !after || key(r) > key(after))
        .sort((a, b) => key(a).localeCompare(key(b)))
        .slice(0, limit);
    },
  };
  return { remote, rowsOf, upserts, serverNow };
}
