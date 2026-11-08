/**
 * Local database (IndexedDB via Dexie). The UI reads and writes ONLY here;
 * the sync engine copies changes to and from Supabase in the background.
 *
 * Changing the schema: never edit an existing version() block. Add a new
 * version with the change (and an upgrade() if data must move). See the
 * `data-model` skill.
 */
import Dexie, { type EntityTable } from "dexie";
import type { Budget, Category, Settings, Transaction, Wallet } from "./types";

export class MoneyDB extends Dexie {
  settings!: EntityTable<Settings, "id">;
  wallets!: EntityTable<Wallet, "id">;
  categories!: EntityTable<Category, "id">;
  transactions!: EntityTable<Transaction, "id">;
  budgets!: EntityTable<Budget, "id">;
  meta!: EntityTable<{ key: string; value: string }, "key">;

  constructor(name = "money-management") {
    super(name);
    // Only indexed fields are listed. `id` is the primary key.
    this.version(1).stores({
      settings: "id, _dirty",
      wallets: "id, sort_order, archived, _dirty, updated_at",
      categories: "id, key, type, sort_order, _dirty, updated_at",
      transactions:
        "id, occurred_at, wallet_id, to_wallet_id, category_id, type, [wallet_id+occurred_at], _dirty, updated_at",
      budgets: "id, [month+category_id], _dirty, updated_at",
      meta: "key", // e.g. last_pull_at
    });
  }
}

export const db = new MoneyDB();
