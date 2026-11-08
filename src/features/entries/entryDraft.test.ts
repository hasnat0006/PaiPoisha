import { beforeEach, describe, expect, it } from "vitest";
import type { Category, Wallet } from "@/db/types";
import type { EntryDraft } from "@/lib/entries";
import { DRAFT_TTL_MS, dropDraft, keepDraft, keptDraft } from "./entryDraft";
import type { EntriesData } from "./useEntries";

const data = {
  activeWallets: [{ id: "cash" }, { id: "bkash" }] as Wallet[],
  categories: [
    { id: "food", type: "expense", hidden: false },
    { id: "gone", type: "expense", hidden: true },
  ] as Category[],
} as EntriesData;
const draft: EntryDraft = { type: "expense", amount: "120+80", fee: "", categoryId: "food", walletId: "bkash", toWalletId: "cash", day: "2026-11-08", note: "lunch" };
const T = 1_000_000;

beforeEach(dropDraft);

describe("add-sheet draft", () => {
  it("comes back within 2 minutes, then is gone", () => {
    keepDraft(draft, T);
    expect(keptDraft(data, T + DRAFT_TTL_MS)).toEqual(draft);
    expect(keptDraft(data, T + DRAFT_TTL_MS + 1)).toBeNull();
  });

  it("isn't kept when nothing was filled in, and dropDraft clears it", () => {
    keepDraft(draft, T);
    keepDraft({ ...draft, amount: "", categoryId: null, note: "  " }, T); // emptied again
    expect(keptDraft(data, T)).toBeNull();
    keepDraft(draft, T);
    dropDraft();
    expect(keptDraft(data, T)).toBeNull();
  });

  it("forgets wallets and a category that are no longer usable", () => {
    keepDraft({ ...draft, walletId: "archived", categoryId: "gone" }, T);
    expect(keptDraft(data, T)).toMatchObject({ walletId: null, toWalletId: "cash", categoryId: null, amount: "120+80" });
    keepDraft({ ...draft, type: "income" }, T); // the category belongs to the other type
    expect(keptDraft(data, T)?.categoryId).toBeNull();
  });

  it("ignores a broken stored value", () => {
    localStorage.setItem("mm.entryDraft", "{not json");
    expect(keptDraft(data, T)).toBeNull();
  });
});
