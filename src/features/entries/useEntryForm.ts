/**
 * State for the add/edit sheet: the draft, which field the number pad types
 * into, validation errors, and save/delete actions.
 */
import { useEffect, useRef, useState } from "react";
import type { Transaction, TransactionType } from "@/db/types";
import { buildEntry, dhakaDay, paisaToInput, type EntryDraft, type EntryError, type EntryFields } from "@/lib/entries";
import { dropDraft, keepDraft, keptDraft } from "./entryDraft";
import { deleteEntry, saveEntry, type EntriesData } from "./useEntries";

/** The wallet of the most recently created entry, if still active; else the first wallet. */
function lastUsedWallet({ entries, activeWallets }: EntriesData): string | null {
  const latest = entries.reduce<Transaction | null>((a, t) => (!a || t.created_at > a.created_at ? t : a), null);
  const active = activeWallets.some((w) => w.id === latest?.wallet_id);
  return active ? latest!.wallet_id : (activeWallets[0]?.id ?? null);
}

function initialDraft(data: EntriesData, editing: Transaction | null, prefill: Partial<EntryDraft> = {}): EntryDraft {
  if (editing) {
    return {
      type: editing.type,
      amount: paisaToInput(editing.amount_paisa),
      fee: editing.fee_paisa ? paisaToInput(editing.fee_paisa) : "",
      categoryId: editing.category_id,
      walletId: editing.wallet_id,
      toWalletId: editing.to_wallet_id,
      day: dhakaDay(editing.occurred_at),
      note: editing.note,
    };
  }
  // An unsaved entry closed under 2 minutes ago comes back, unless a quick-add link brings its own values.
  const kept = Object.keys(prefill).length ? null : keptDraft(data);
  if (kept) return { ...kept, walletId: kept.walletId ?? lastUsedWallet(data) };
  const walletId = prefill.walletId ?? lastUsedWallet(data);
  return {
    type: "expense",
    amount: "",
    fee: "",
    categoryId: null,
    toWalletId: data.activeWallets.find((w) => w.id !== walletId)?.id ?? null,
    day: dhakaDay(new Date()),
    note: "",
    ...prefill, // from a quick-add link (spec §9)
    walletId,
  };
}

/** Mount with a `key` per opening. A new entry starts from the kept draft (entryDraft.ts) or fresh; `prefill` applies to new entries only. */
export function useEntryForm(data: EntriesData, editing: Transaction | null, prefill?: Partial<EntryDraft>) {
  const [draft, setDraft] = useState(() => initialDraft(data, editing, prefill));
  const [padField, setPadField] = useState<"amount" | "fee">("amount");
  const [errors, setErrors] = useState<EntryError[]>([]);
  const saved = useRef(false);

  // New entries only: keep what's filled in on every change, and again on close so the 2 minutes count from then.
  const isNew = !editing;
  useEffect(() => {
    if (!isNew) return;
    keepDraft(draft);
    return () => {
      if (!saved.current) keepDraft(draft);
    };
  }, [isNew, draft]);

  const set = (changes: Partial<EntryDraft>) => {
    setDraft((d) => ({ ...d, ...changes }));
    setErrors([]);
  };
  const setType = (type: TransactionType) => {
    set({ type, categoryId: null }); // expense and income have separate category lists
    setPadField("amount");
  };

  /** Returns the saved fields, or the errors (also shown inline). With `again`, keeps type, wallet and date for the next entry. */
  const save = async (again: boolean): Promise<EntryFields | { errors: EntryError[] }> => {
    const r = buildEntry(draft, new Date(), editing?.occurred_at);
    if (!r.ok) {
      setErrors(r.errors);
      return { errors: r.errors };
    }
    await saveEntry(r.row, editing?.id);
    if (isNew && !again) {
      saved.current = true;
      dropDraft();
    }
    if (again) {
      setDraft((d) => ({ ...d, amount: "", fee: "", categoryId: null, note: "" }));
      setPadField("amount");
    }
    return r.row;
  };

  const remove = () => deleteEntry(editing!.id);

  return { draft, set, setType, padField, setPadField, errors, save, remove };
}
