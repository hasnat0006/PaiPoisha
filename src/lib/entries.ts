/**
 * Pure helpers for the add/edit entry sheet and the entry list:
 * Dhaka calendar days, validation, building a transaction row,
 * category ordering and day grouping. No React, no Dexie.
 */
import type { Category, Transaction, TransactionType } from "@/db/types";
import { isValidAmount, parseAmount, type Locale, type Paisa } from "./money";

/** Bangladesh has no daylight saving: always UTC+6. */
const DHAKA_OFFSET_MS = 6 * 3600_000;
export const NOTE_MAX = 100;

/** Calendar day "YYYY-MM-DD" in Asia/Dhaka for a moment. */
export function dhakaDay(at: string | Date): string {
  return new Date(new Date(at).getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Shift a "YYYY-MM-DD" day by n days. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface EntryDraft {
  type: TransactionType;
  amount: string; // what the user typed on the pad, e.g. "120+80"
  fee: string; // transfers only
  categoryId: string | null;
  walletId: string | null;
  toWalletId: string | null;
  day: string; // "YYYY-MM-DD" in Dhaka
  note: string;
}

export type EntryError = "amount" | "fee" | "category" | "wallets" | "date";
export type EntryFields = Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at" | "deleted_at" | "_dirty">;

/**
 * Validate a draft (spec §3) and build the row to save.
 * `keepOccurredAt` is the original time when editing, kept if the day didn't change.
 */
export function buildEntry(
  d: EntryDraft,
  now: Date,
  keepOccurredAt?: string,
): { ok: true; row: EntryFields } | { ok: false; errors: EntryError[] } {
  const errors: EntryError[] = [];
  const amount = parseAmount(d.amount);
  if (!isValidAmount(amount)) errors.push("amount");

  const isTransfer = d.type === "transfer";
  let fee: Paisa = 0;
  if (isTransfer && d.fee.trim() !== "") {
    const f = parseAmount(d.fee);
    if (f === null || (f !== 0 && !isValidAmount(f))) errors.push("fee");
    else fee = f;
  }
  if (!isTransfer && !d.categoryId) errors.push("category");
  if (!d.walletId || (isTransfer && (!d.toWalletId || d.toWalletId === d.walletId))) errors.push("wallets");
  if (d.day > dhakaDay(now)) errors.push("date");
  if (errors.length) return { ok: false, errors };

  let occurred_at: string;
  if (keepOccurredAt && dhakaDay(keepOccurredAt) === d.day) occurred_at = keepOccurredAt;
  else if (d.day === dhakaDay(now)) occurred_at = now.toISOString();
  else occurred_at = new Date(`${d.day}T12:00:00+06:00`).toISOString(); // past day: noon, no real time known

  return {
    ok: true,
    row: {
      type: d.type,
      amount_paisa: amount as Paisa,
      wallet_id: d.walletId as string,
      to_wallet_id: isTransfer ? d.toWalletId : null,
      category_id: isTransfer ? null : d.categoryId,
      fee_paisa: isTransfer ? fee : 0,
      note: d.note.trim().slice(0, NOTE_MAX),
      occurred_at,
    },
  };
}

/** A category's name in the current language; custom ones may have only one name. */
export function categoryName(c: Pick<Category, "name_bn" | "name_en">, locale: Locale): string {
  return (locale === "bn" ? (c.name_bn ?? c.name_en) : (c.name_en ?? c.name_bn)) ?? "";
}

/** Categories most used first (ties keep sort_order). Caller filters type/hidden. */
export function sortByUsage(cats: Category[], txs: Pick<Transaction, "category_id">[]): Category[] {
  const uses = new Map<string, number>();
  for (const t of txs) if (t.category_id) uses.set(t.category_id, (uses.get(t.category_id) ?? 0) + 1);
  return [...cats].sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.sort_order - b.sort_order);
}

/** Group entries (already newest first) by Dhaka day. */
export function groupByDay<T extends Pick<Transaction, "occurred_at">>(txs: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const t of txs) {
    const day = dhakaDay(t.occurred_at);
    const g = groups.get(day);
    if (g) g.push(t);
    else groups.set(day, [t]);
  }
  return [...groups];
}

/** Paisa -> what the pad would show, e.g. 15050 -> "150.50", 15000 -> "150". No float maths. */
export function paisaToInput(p: Paisa): string {
  if (p < 0) return `-${paisaToInput(-p)}`;
  const frac = p % 100;
  return `${Math.floor(p / 100)}${frac ? `.${String(frac).padStart(2, "0")}` : ""}`;
}
