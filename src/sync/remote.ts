/**
 * The engine's only view of the cloud: three calls, backed by Supabase (RLS keeps each user
 * to their own rows). Tests swap in an in-memory server with the same shape.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncedTable } from "@/db/types";

export type RemoteRow = Record<string, unknown> & { id: string; updated_at: string };
/** Position in a table's pull: the last row seen, ordered by (updated_at, id). Values are the server's. */
export interface Cursor {
  updated_at: string;
  id: string;
}

export interface Remote {
  user(): Promise<{ id: string; email: string | null; avatar?: string | null } | null>;
  upsert(table: SyncedTable, rows: Record<string, unknown>[]): Promise<void>;
  /** Rows after `after` in (updated_at, id) order, at most `limit`. */
  pullPage(table: SyncedTable, after: Cursor | null, limit: number): Promise<RemoteRow[]>;
}

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async user() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error; // e.g. a token refresh that failed offline: retry, don't treat as signed out
      const u = data.session?.user;
      return u ? { id: u.id, email: u.email ?? null, avatar: u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null } : null;
    },
    async upsert(table, rows) {
      const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
      if (error) throw error;
    },
    async pullPage(table, after, limit) {
      let q = client.from(table).select("*");
      // Keyset paging: rows sharing one updated_at (a 500-row upsert) are never split or skipped.
      if (after) q = q.or(`updated_at.gt."${after.updated_at}",and(updated_at.eq."${after.updated_at}",id.gt.${after.id})`);
      const { data, error } = await q.order("updated_at").order("id").limit(limit);
      if (error) throw error;
      return data as RemoteRow[];
    },
  };
}
