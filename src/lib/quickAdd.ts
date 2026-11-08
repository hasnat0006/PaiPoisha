/**
 * Quick-add link (spec §9): /add?type=&amount=&cat=&wallet=&note= -> fields to pre-fill in the
 * add sheet. Never saves. Unknown or invalid values are dropped so the user picks them.
 */
import type { Category, TransactionType, Wallet } from "@/db/types";
import { NOTE_MAX, type EntryDraft } from "./entries";
import { isValidAmount, parseAmount, toAsciiDigits } from "./money";

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const norm = (s: string) => s.trim().toLowerCase();

export function parseQuickAdd(
  params: URLSearchParams,
  categories: Category[],
  wallets: Wallet[], // active wallets
): Partial<EntryDraft> {
  const out: Partial<EntryDraft> = {};
  const type = params.get("type");
  if (type && (TYPES as string[]).includes(type)) out.type = type as TransactionType;

  const amount = params.get("amount");
  if (amount && isValidAmount(parseAmount(amount))) out.amount = toAsciiDigits(amount.trim()).replace(/[,\s৳]/g, "");

  const cat = params.get("cat");
  if (cat && out.type !== "transfer") {
    const q = norm(cat);
    const pool = categories.filter((c) => !c.hidden && c.key !== "adjustment" && (!out.type || c.type === out.type));
    const match = pool.find((c) => c.key === q) ?? pool.find((c) => [c.name_en, c.name_bn].some((n) => n && norm(n) === q));
    if (match) {
      out.categoryId = match.id;
      out.type ??= match.type; // cat=salary alone means income
    }
  }

  const wallet = params.get("wallet");
  if (wallet) {
    const q = norm(wallet);
    // Wallets have no key: match the name, then the provider ("bkash"), then the kind ("cash").
    const match = wallets.find((w) => norm(w.name) === q) ?? wallets.find((w) => w.provider === q) ?? wallets.find((w) => w.kind === q);
    if (match) out.walletId = match.id;
  }

  const note = params.get("note");
  if (note) out.note = note.trim().slice(0, NOTE_MAX);
  return out;
}
