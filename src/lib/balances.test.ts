import { describe, expect, it } from "vitest";
import { adjustmentFor, totalBalance, walletBalances } from "./balances";

const wallets = [
  { id: "cash", opening_balance_paisa: 100000 }, // ৳1,000
  { id: "bkash", opening_balance_paisa: 0 },
];
const tx = (o: Partial<Parameters<typeof walletBalances>[1][number]>) => ({
  type: "expense" as const,
  amount_paisa: 0,
  fee_paisa: 0,
  wallet_id: "cash",
  to_wallet_id: null,
  deleted_at: null,
  ...o,
});

describe("walletBalances", () => {
  it("is the opening balance with zero entries", () => {
    expect(walletBalances(wallets, [])).toEqual(new Map([["cash", 100000], ["bkash", 0]]));
  });

  it("adds income and subtracts expenses", () => {
    const b = walletBalances(wallets, [
      tx({ type: "income", amount_paisa: 50000 }), // ৳500
      tx({ type: "expense", amount_paisa: 15050 }), // ৳150.50
    ]);
    expect(b.get("cash")).toBe(134950);
  });

  it("ignores soft-deleted entries", () => {
    const b = walletBalances(wallets, [tx({ amount_paisa: 15000, deleted_at: "2026-11-07T10:00:00Z" })]);
    expect(b.get("cash")).toBe(100000);
  });

  it("takes a transfer fee from the From wallet only", () => {
    // bKash → Cash ৳1,000 cash-out with a ৳18.50 fee
    const b = walletBalances(wallets, [tx({ type: "transfer", wallet_id: "bkash", to_wallet_id: "cash", amount_paisa: 100000, fee_paisa: 1850 })]);
    expect(b.get("bkash")).toBe(-101850);
    expect(b.get("cash")).toBe(200000);
  });

  it("allows a negative balance", () => {
    expect(walletBalances(wallets, [tx({ wallet_id: "bkash", amount_paisa: 500 })]).get("bkash")).toBe(-500);
  });

  it("handles amounts at the max limit without losing paisa", () => {
    const max = 99999999900; // ৳99,99,99,999
    const b = walletBalances(wallets, [tx({ type: "income", amount_paisa: max }), tx({ type: "income", amount_paisa: max })]);
    expect(b.get("cash")).toBe(100000 + 2 * max);
  });
});

describe("totalBalance", () => {
  it("sums only the wallets given", () => {
    const b = new Map([["cash", 100], ["bkash", -40], ["old", 999]]);
    expect(totalBalance([{ id: "cash" }, { id: "bkash" }], b)).toBe(60);
  });
});

describe("adjustmentFor", () => {
  it("adds income when the real balance is higher, expense when lower, nothing when equal", () => {
    expect(adjustmentFor(10000, 12500)).toEqual({ type: "income", amount_paisa: 2500 });
    expect(adjustmentFor(10000, -500)).toEqual({ type: "expense", amount_paisa: 10500 });
    expect(adjustmentFor(10000, 10000)).toBeNull();
  });
});
