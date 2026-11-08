/**
 * Live data for every screen: entries (newest first), wallets, categories, budgets
 * and the month start day, with soft-deleted rows removed. Seeds defaults on first run.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "@/db/db";
import { insertRow, softDelete, updateRow } from "@/db/repo";
import { ensureSeeded } from "@/db/seed";
import type { Budget, Category, Settings, Transaction, Wallet } from "@/db/types";
import type { EntryFields } from "@/lib/entries";
import { DEFAULT_START_DAY } from "@/lib/period";

export interface EntriesData {
  entries: Transaction[];
  wallets: Wallet[]; // all live wallets incl. archived (for names in history)
  activeWallets: Wallet[]; // for pickers, in the user's order
  categories: Category[];
  budgets: Budget[];
  settings: Settings | null; // null until the user changes a setting
  startDay: number; // month start day, 1–28
}

type State = { status: "loading" } | { status: "error" } | ({ status: "ready" } & EntriesData);

/** `cashName` is null until the language is known, so the seeded wallet gets the right name. */
export function useEntries(cashName: string | null): State & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [seedFailed, setSeedFailed] = useState(false);

  useEffect(() => {
    if (cashName === null) return;
    ensureSeeded(cashName).then(
      () => setSeedFailed(false),
      () => setSeedFailed(true),
    );
  }, [cashName, attempt]);

  const data = useLiveQuery(async (): Promise<State> => {
    try {
      const [txs, wallets, categories, budgets, settings] = await Promise.all([
        db.transactions.orderBy("occurred_at").reverse().toArray(),
        db.wallets.orderBy("sort_order").toArray(),
        db.categories.orderBy("sort_order").toArray(),
        db.budgets.toArray(),
        db.settings.toArray(),
      ]);
      const live = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => !r.deleted_at);
      const liveWallets = live(wallets);
      // One settings row per user; if two were ever made (e.g. two tabs), the oldest wins.
      const setting = live(settings).sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? null;
      return {
        status: "ready",
        // shortcut: loads every entry; paging of 50 comes with the full list in step 4.
        entries: live(txs),
        wallets: liveWallets,
        activeWallets: liveWallets.filter((w) => !w.archived),
        categories: live(categories),
        budgets: live(budgets),
        settings: setting,
        startDay: setting?.month_start_day ?? DEFAULT_START_DAY,
      };
    } catch {
      return { status: "error" };
    }
  }, [attempt]);

  const retry = () => setAttempt((a) => a + 1);
  if (seedFailed) return { status: "error", retry };
  return { ...(data ?? { status: "loading" }), retry };
}

export function saveEntry(row: EntryFields, editingId?: string) {
  return editingId ? updateRow<Transaction>("transactions", editingId, row) : insertRow<Transaction>("transactions", row);
}

export const deleteEntry = (id: string) => softDelete("transactions", id);
