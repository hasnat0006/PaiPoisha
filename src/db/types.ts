/**
 * Data model — the single source of truth for table shapes.
 * The same shapes exist in Dexie (src/db/db.ts) and Supabase
 * (supabase/migrations/*.sql). Change all three together — see the
 * `data-model` skill.
 *
 * Conventions:
 * - ids are UUIDs made on the device (`newId()` in repo.ts).
 * - Money fields end in `_paisa` and are integers.
 * - Timestamps are ISO-8601 strings in UTC.
 * - Rows are never hard-deleted: set `deleted_at` (needed for sync).
 */
import type { Paisa } from "@/lib/money";

export interface SyncFields {
  id: string;
  user_id: string | null; // null until the user signs in; filled on first sync
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** Local only (never sent to Supabase): 1 = changed since last push. */
  _dirty?: 0 | 1;
}

export type Language = "bn" | "en";
export type Theme = "light" | "dark" | "system";

export interface Settings extends SyncFields {
  language: Language;
  bangla_digits: boolean;
  theme: Theme;
  month_start_day: number; // 1–28
}

export type WalletKind = "cash" | "mfs" | "bank" | "card";
export type MfsProvider = "bkash" | "nagad" | "rocket" | "upay" | "other";

export interface Wallet extends SyncFields {
  name: string;
  kind: WalletKind;
  provider: MfsProvider | null; // only for kind = "mfs"
  opening_balance_paisa: Paisa;
  color: string; // hex
  icon: string; // lucide icon name
  archived: boolean;
  sort_order: number;
}

export type CategoryType = "expense" | "income";

/** Built-in categories that can never be deleted (see spec §4). */
export type SystemCategoryKey = "other_expense" | "other_income" | "fees" | "adjustment";

export interface Category extends SyncFields {
  key: string | null; // stable key for defaults, e.g. "groceries"; null for custom
  name_en: string | null;
  name_bn: string | null;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: boolean;
  is_system: boolean; // undeletable built-ins
  hidden: boolean;
  sort_order: number;
}

export type TransactionType = "expense" | "income" | "transfer";

export interface Transaction extends SyncFields {
  type: TransactionType;
  amount_paisa: Paisa; // always > 0; direction comes from `type`
  wallet_id: string; // the "from" wallet for transfers
  to_wallet_id: string | null; // transfers only
  category_id: string | null; // null for transfers
  fee_paisa: Paisa; // transfers only, else 0
  note: string; // up to 100 chars, may be ""
  occurred_at: string; // ISO date-time the money moved
}

export interface Budget extends SyncFields {
  category_id: string | null; // null = overall monthly budget
  month: string; // "YYYY-MM" (the period's start month)
  limit_paisa: Paisa;
}

/** Tables that sync with Supabase, in push order (parents before children). */
export const SYNCED_TABLES = ["settings", "wallets", "categories", "transactions", "budgets"] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];
