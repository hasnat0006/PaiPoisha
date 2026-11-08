/**
 * An unsaved new entry survives closing the add sheet for 2 minutes (user, 2026-11-08), e.g. while
 * checking a bKash SMS for the amount. Kept in localStorage so it also survives the phone reloading
 * the app in the background. Edits of existing entries are never kept. Cleared on save and on sign-out.
 */
import type { EntriesData } from "./useEntries";
import type { EntryDraft } from "@/lib/entries";

export const DRAFT_KEY = "mm.entryDraft";
export const DRAFT_TTL_MS = 2 * 60_000;

/** Nothing the user typed or picked: not worth keeping. */
const isEmpty = (d: EntryDraft) => !d.amount && !d.fee && !d.categoryId && !d.note.trim();

/** Keeps the draft (stamped now), or drops it when nothing was filled in. */
export function keepDraft(draft: EntryDraft, now = Date.now()): void {
  try {
    if (isEmpty(draft)) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, JSON.stringify({ at: now, draft }));
  } catch {
    /* private mode or full: the draft is simply not kept */
  }
}

export function dropDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* private mode */
  }
}

/** The kept draft if it is under 2 minutes old, with wallets and category that still exist; else null. */
export function keptDraft(data: EntriesData, now = Date.now()): EntryDraft | null {
  let saved: { at: number; draft: EntryDraft } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
  } catch {
    return null;
  }
  if (!saved || typeof saved.at !== "number" || now - saved.at > DRAFT_TTL_MS || now < saved.at) return null;
  const d = saved.draft;
  const wallet = (id: string | null) => (data.activeWallets.some((w) => w.id === id) ? id : null);
  const category = data.categories.find((c) => c.id === d.categoryId && !c.hidden && c.type === d.type);
  return { ...d, walletId: wallet(d.walletId), toWalletId: wallet(d.toWalletId), categoryId: category ? d.categoryId : null };
}
