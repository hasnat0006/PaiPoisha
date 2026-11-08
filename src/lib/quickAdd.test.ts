import { describe, expect, it } from "vitest";
import type { Category, Wallet } from "@/db/types";
import { parseQuickAdd } from "./quickAdd";

const cats = [
  { id: "c-tr", key: "transport", name_en: "Transport", name_bn: "যাতায়াত", type: "expense", hidden: false },
  { id: "c-sal", key: "salary", name_en: "Salary", name_bn: "বেতন", type: "income", hidden: false },
  { id: "c-gym", key: null, name_en: "Gym", name_bn: null, type: "expense", hidden: false },
  { id: "c-hid", key: "rent", name_en: "Rent", name_bn: "বাসা ভাড়া", type: "expense", hidden: true },
  { id: "c-adj", key: "adjustment", name_en: "Balance adjustment", name_bn: null, type: "expense", hidden: false },
] as Category[];
const wallets = [
  { id: "w-cash", name: "ক্যাশ", kind: "cash", provider: null },
  { id: "w-bk", name: "My bKash", kind: "mfs", provider: "bkash" },
] as Wallet[];
const parse = (q: string) => parseQuickAdd(new URLSearchParams(q), cats, wallets);

describe("parseQuickAdd", () => {
  it("fills every field from the spec example", () => {
    expect(parse("type=expense&amount=150&cat=transport&wallet=bkash&note=rickshaw")).toEqual({
      type: "expense", amount: "150", categoryId: "c-tr", walletId: "w-bk", note: "rickshaw",
    });
  });

  it("matches a category by name in either language, and a wallet by name or kind", () => {
    expect(parse("cat=যাতায়াত").categoryId).toBe("c-tr");
    expect(parse("cat=gym").categoryId).toBe("c-gym");
    expect(parse("wallet=ক্যাশ").walletId).toBe("w-cash");
    expect(parse("wallet=cash").walletId).toBe("w-cash");
  });

  it("infers income from an income category when type is missing", () => {
    expect(parse("cat=salary")).toEqual({ categoryId: "c-sal", type: "income" });
  });

  it("accepts Bangla digits and decimals in the amount", () => {
    expect(parse("amount=১২০.৫০").amount).toBe("120.50");
  });

  it("drops unknown or invalid values", () => {
    expect(parse("type=loan&amount=abc&cat=pizza&wallet=nagad")).toEqual({});
    expect(parse("amount=0")).toEqual({});
    expect(parse("type=expense&cat=salary")).toEqual({ type: "expense" }); // category of the wrong type
    expect(parse("cat=rent")).toEqual({}); // hidden
    expect(parse("cat=adjustment")).toEqual({}); // internal
    expect(parse("type=transfer&cat=transport")).toEqual({ type: "transfer" }); // transfers have no category
  });

  it("cuts the note to 100 characters", () => {
    expect(parse(`note=${"a".repeat(150)}`).note).toHaveLength(100);
  });
});
