/**
 * State for the add/edit sheet: the draft, which field the number pad types
 * into, validation errors, and save/delete actions.
 */
import { useState } from "react";
import type { Transaction, TransactionType } from "@/db/types";
import { buildEntry, dhakaDay, paisaToInput, type EntryDraft, type EntryError, type EntryFields } from "@/lib/entries";
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

/** Mount with a `key` per opening so the draft starts fresh each time. `prefill` applies to new entries only. */
export function useEntryForm(data: EntriesData, editing: Transaction | null, prefill?: Partial<EntryDraft>) {
  const [draft, setDraft] = useState(() => initialDraft(data, editing, prefill));
  const [padField, setPadField] = useState<"amount" | "fee">("amount");
  const [errors, setErrors] = useState<EntryError[]>([]);

  const set = (changes: Partial<EntryDraft>) => {
    setDraft((d) => ({ ...d, ...changes }));
    setErrors([]);
  };
  const setType = (type: TransactionType) => {
    set({ type, categoryId: null }); // expense and income have separate category lists
    setPadField("amount");
  };

  /** Returns the saved fields, or null if invalid. With `again`, keeps type, wallet and date for the next entry. */
  const save = async (again: boolean): Promise<EntryFields | null> => {
    const r = buildEntry(draft, new Date(), editing?.occurred_at);
    if (!r.ok) {
      setErrors(r.errors);
      return null;
    }
    await saveEntry(r.row, editing?.id);
    if (again) {
      setDraft((d) => ({ ...d, amount: "", fee: "", categoryId: null, note: "" }));
      setPadField("amount");
    }
    return r.row;
  };

  const remove = () => deleteEntry(editing!.id);

  return { draft, set, setType, padField, setPadField, errors, save, remove };
}
