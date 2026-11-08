import { describe, expect, it } from "vitest";
import type { Category, Transaction } from "@/db/types";
import { filterEntries, NO_FILTERS } from "./filter";
import { periodFromKey } from "./period";
import { netOf } from "./totals";

const cats = new Map(
  [
    { id: "transport", name_bn: "যাতায়াত", name_en: "Transport" },
    { id: "groceries", name_bn: "বাজার", name_en: "Groceries" },
  ].map((c) => [c.id, c as Category]),
);
let n = 0;
const tx = (o: Partial<Transaction>) =>
  ({ id: String(n++), type: "expense", amount_paisa: 1000, fee_paisa: 0, wallet_id: "cash", to_wallet_id: null, category_id: "transport", note: "", occurred_at: "2026-10-10T10:00:00+06:00", deleted_at: null, ...o }) as Transaction;

const entries = [
  tx({ wallet_id: "bkash", amount_paisa: 12000 }), // ✓ bKash, Transport, Oct: ৳120
  tx({ wallet_id: "bkash", amount_paisa: 4500, note: "CNG" }), // ✓ ৳45
  tx({ wallet_id: "bkash", amount_paisa: 9900, occurred_at: "2026-11-01T00:00:00+06:00" }), // November
  tx({ wallet_id: "bkash", category_id: "groceries" }),
  tx({ wallet_id: "cash" }),
  tx({ type: "transfer", wallet_id: "cash", to_wallet_id: "bkash", category_id: null, amount_paisa: 50000 }),
  tx({ wallet_id: "bkash", amount_paisa: 2000, occurred_at: "2026-09-30T23:59:00+06:00" }), // September
];

describe("filterEntries", () => {
  it("bKash + Transport + October shows exactly the right entries and total (spec §7 Done when)", () => {
    const f = { ...NO_FILTERS, walletId: "bkash", categoryId: "transport", period: periodFromKey("2026-10", 1) };
    const rows = filterEntries(entries, f, cats);
    expect(rows.map((r) => r.amount_paisa)).toEqual([12000, 4500]);
    expect(netOf(rows, {})).toBe(-16500); // −৳165
  });

  it("a wallet filter includes transfers into that wallet", () => {
    expect(filterEntries(entries, { ...NO_FILTERS, walletId: "bkash", type: "transfer" }, cats)).toHaveLength(1);
  });

  it("searches the note, the category name in either language, and the amount", () => {
    const search = (s: string) => filterEntries(entries, { ...NO_FILTERS, search: s }, cats).length;
    expect(search("cng")).toBe(1);
    expect(search("বাজার")).toBe(1);
    expect(search("groc")).toBe(1);
    expect(search("45")).toBe(1); // ৳45
    expect(search("৪৫")).toBe(1);
    expect(search("xyz")).toBe(0);
  });
});
