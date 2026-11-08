/**
 * Wallet writes and the rules that guard them (spec §2): at least one active
 * wallet, wallets with entries can only be archived, Adjust balance.
 */
import { db } from "@/db/db";
import { insertRow, softDelete, updateRow } from "@/db/repo";
import type { Transaction, Wallet } from "@/db/types";
import { adjustmentFor } from "@/lib/balances";
import { isValidAmount, type Paisa } from "@/lib/money";
import { move, sortOrderChanges } from "@/lib/order";
import type { EntriesData } from "../entries/useEntries";

export const WALLET_NAME_MAX = 30;
export type WalletFields = Pick<Wallet, "name" | "kind" | "provider" | "opening_balance_paisa" | "color" | "icon">;

export const hasEntries = (walletId: string, entries: Transaction[]) =>
  entries.some((t) => t.wallet_id === walletId || t.to_wallet_id === walletId);

/** The last active wallet can't be archived (or deleted). */
const isLastActive = (w: Wallet, data: EntriesData) => !w.archived && data.activeWallets.length <= 1;

export const canArchive = (w: Wallet, data: EntriesData) => !w.archived && !isLastActive(w, data);
export const canDelete = (w: Wallet, data: EntriesData) => !hasEntries(w.id, data.entries) && !isLastActive(w, data);

export async function saveWallet(fields: WalletFields, data: EntriesData, id?: string): Promise<void> {
  const row = { ...fields, name: fields.name.trim().slice(0, WALLET_NAME_MAX), provider: fields.kind === "mfs" ? fields.provider : null };
  if (id) return updateRow<Wallet>("wallets", id, row);
  const sort_order = Math.max(-1, ...data.wallets.map((w) => w.sort_order)) + 1;
  await insertRow<Wallet>("wallets", { ...row, archived: false, sort_order });
}

export async function setArchived(w: Wallet, archived: boolean, data: EntriesData): Promise<void> {
  if (archived && !canArchive(w, data)) throw new Error("last-active-wallet");
  await updateRow<Wallet>("wallets", w.id, { archived });
}

export async function deleteWallet(w: Wallet, data: EntriesData): Promise<void> {
  if (!canDelete(w, data)) throw new Error("wallet-in-use");
  await softDelete("wallets", w.id);
}

/**
 * Add an entry in the system "adjustment" category so the app's balance becomes `real`.
 * Returns false if there was nothing to adjust or the gap is over the max amount.
 */
export async function adjustBalance(w: Wallet, appBalance: Paisa, real: Paisa, data: EntriesData): Promise<boolean> {
  const adj = adjustmentFor(appBalance, real);
  const category = data.categories.find((c) => c.key === "adjustment");
  if (!adj || !isValidAmount(adj.amount_paisa) || !category) return false;
  await insertRow<Transaction>("transactions", {
    ...adj,
    wallet_id: w.id,
    to_wallet_id: null,
    category_id: category.id, // one row for both directions (decisions.md)
    fee_paisa: 0,
    note: "",
    occurred_at: new Date().toISOString(),
  });
  return true;
}

/** Move a wallet up/down among the given list (active wallets, in order) and save the new order. */
export async function moveWallet(list: Wallet[], index: number, dir: -1 | 1): Promise<void> {
  const changes = sortOrderChanges(move(list, index, dir));
  await db.transaction("rw", db.wallets, () => Promise.all(changes.map((c) => updateRow<Wallet>("wallets", c.id, { sort_order: c.sort_order }))));
}
