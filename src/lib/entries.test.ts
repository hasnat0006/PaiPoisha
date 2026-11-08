import { describe, expect, it } from "vitest";
import type { Category } from "@/db/types";
import { addDays, buildEntry, categoryName, dhakaDay, groupByDay, paisaToInput, sortByUsage, type EntryDraft } from "./entries";

const now = new Date("2026-11-07T20:00:00+06:00");
const draft: EntryDraft = {
  type: "expense",
  amount: "150",
  fee: "",
  categoryId: "c1",
  walletId: "w1",
  toWalletId: null,
  day: "2026-11-07",
  note: "",
};

describe("dhakaDay / addDays", () => {
  it("uses the Dhaka calendar day, not UTC", () => {
    expect(dhakaDay("2026-11-06T19:30:00Z")).toBe("2026-11-07"); // 01:30 in Dhaka
  });
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("buildEntry", () => {
  it("builds an expense saved today with the current time", () => {
    const r = buildEntry(draft, now);
    expect(r).toEqual({
      ok: true,
      row: {
        type: "expense",
        amount_paisa: 15000, // ৳150
        wallet_id: "w1",
        to_wallet_id: null,
        category_id: "c1",
        fee_paisa: 0,
        note: "",
        occurred_at: now.toISOString(),
      },
    });
  });

  it("accepts Bangla digits and quick sums", () => {
    const r = buildEntry({ ...draft, amount: "১২০+৮০.৫০" }, now);
    expect(r.ok && r.row.amount_paisa).toBe(20050); // ৳200.50
  });

  it("rejects zero, empty, too many decimals and over the max", () => {
    for (const amount of ["", "0", "1.234", "1000000000", "50-80"]) {
      expect(buildEntry({ ...draft, amount }, now)).toEqual({ ok: false, errors: ["amount"] });
    }
  });

  it("accepts the max amount", () => {
    const r = buildEntry({ ...draft, amount: "999999999" }, now); // ৳99,99,99,999
    expect(r.ok && r.row.amount_paisa).toBe(99999999900);
  });

  it("needs a category for expense and income", () => {
    expect(buildEntry({ ...draft, type: "income", categoryId: null }, now)).toEqual({ ok: false, errors: ["category"] });
  });

  it("rejects future days", () => {
    expect(buildEntry({ ...draft, day: "2026-11-08" }, now)).toEqual({ ok: false, errors: ["date"] });
  });

  it("puts a past day at noon Dhaka time", () => {
    const r = buildEntry({ ...draft, day: "2026-11-06" }, now);
    expect(r.ok && r.row.occurred_at).toBe("2026-11-06T06:00:00.000Z");
  });

  it("keeps the original time when editing without changing the day", () => {
    const orig = "2026-11-05T03:15:00.000Z";
    const r = buildEntry({ ...draft, day: "2026-11-05" }, now, orig);
    expect(r.ok && r.row.occurred_at).toBe(orig);
  });

  it("builds a transfer with a fee and no category", () => {
    const r = buildEntry({ ...draft, type: "transfer", toWalletId: "w2", fee: "18.50" }, now);
    expect(r.ok && r.row).toMatchObject({ category_id: null, to_wallet_id: "w2", fee_paisa: 1850 });
  });

  it("treats an empty fee as no fee", () => {
    const r = buildEntry({ ...draft, type: "transfer", toWalletId: "w2" }, now);
    expect(r.ok && r.row.fee_paisa).toBe(0);
  });

  it("rejects a transfer to the same wallet, or without a To wallet", () => {
    expect(buildEntry({ ...draft, type: "transfer", toWalletId: "w1" }, now)).toEqual({ ok: false, errors: ["wallets"] });
    expect(buildEntry({ ...draft, type: "transfer" }, now)).toEqual({ ok: false, errors: ["wallets"] });
  });

  it("rejects a negative fee", () => {
    const r = buildEntry({ ...draft, type: "transfer", toWalletId: "w2", fee: "5-10" }, now);
    expect(r).toEqual({ ok: false, errors: ["fee"] });
  });

  it("trims the note to 100 characters", () => {
    const r = buildEntry({ ...draft, note: `  ${"a".repeat(120)}  ` }, now);
    expect(r.ok && r.row.note).toHaveLength(100);
  });
});

describe("categoryName", () => {
  it("falls back to the other language when one name is missing", () => {
    expect(categoryName({ name_bn: "বাজার", name_en: "Groceries" }, "en")).toBe("Groceries");
    expect(categoryName({ name_bn: null, name_en: "Gym" }, "bn")).toBe("Gym");
  });
});

describe("sortByUsage", () => {
  it("puts the most used first and keeps sort_order for ties", () => {
    const cats = [{ id: "a", sort_order: 0 }, { id: "b", sort_order: 1 }, { id: "c", sort_order: 2 }] as Category[];
    const txs = [{ category_id: "c" }, { category_id: "c" }, { category_id: "b" }];
    expect(sortByUsage(cats, txs).map((c) => c.id)).toEqual(["c", "b", "a"]);
  });
});

describe("groupByDay", () => {
  it("groups by Dhaka day in input order", () => {
    const txs = [
      { occurred_at: "2026-11-06T19:00:00Z" }, // 7 Nov Dhaka
      { occurred_at: "2026-11-06T17:00:00Z" }, // 6 Nov Dhaka
      { occurred_at: "2026-11-06T10:00:00Z" },
    ];
    expect(groupByDay(txs).map(([d, g]) => [d, g.length])).toEqual([["2026-11-07", 1], ["2026-11-06", 2]]);
  });
});

describe("paisaToInput", () => {
  it("round-trips through parseAmount", () => {
    expect(paisaToInput(15050)).toBe("150.50"); // ৳150.50
    expect(paisaToInput(15000)).toBe("150");
    expect(paisaToInput(5)).toBe("0.05");
    expect(paisaToInput(-550)).toBe("-5.50"); // −৳5.50 (negative opening balance)
  });
});
