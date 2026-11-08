import { describe, expect, it } from "vitest";
import { formatMoney, isValidAmount, parseAmount, parseSignedAmount, takaToPaisa, toAsciiDigits } from "./money";

describe("takaToPaisa", () => {
  it("avoids floating point drift", () => {
    expect(takaToPaisa(0.1 + 0.2)).toBe(30);
    expect(takaToPaisa(150.5)).toBe(15050);
    expect(takaToPaisa(1.005)).toBe(101);
  });
});

describe("parseAmount", () => {
  it("parses plain, Bangla and decimal input", () => {
    expect(parseAmount("150")).toBe(15000);
    expect(parseAmount("১৫০")).toBe(15000);
    expect(parseAmount("150.5")).toBe(15050);
    expect(parseAmount("1,00,000")).toBe(10000000);
  });
  it("adds simple sums", () => {
    expect(parseAmount("120+80")).toBe(20000);
    expect(parseAmount("500-120.50")).toBe(37950);
  });
  it("rejects invalid input", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
    expect(parseAmount("++5")).toBeNull();
  });
});

describe("isValidAmount", () => {
  it("requires a positive integer within the max", () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-100)).toBe(false);
    expect(isValidAmount(null)).toBe(false);
  });
});

describe("formatMoney", () => {
  it("uses lakh grouping", () => {
    expect(formatMoney(12345600, "en")).toBe("৳1,23,456");
    expect(formatMoney(1000000000, "en")).toBe("৳1,00,00,000");
    expect(formatMoney(99900, "en")).toBe("৳999");
  });
  it("uses Bangla digits for bn by default", () => {
    expect(formatMoney(12345600, "bn")).toBe("৳১,২৩,৪৫৬");
    expect(formatMoney(12345600, "bn", { banglaDigits: false })).toBe("৳1,23,456");
  });
  it("handles decimals, negatives and signs", () => {
    expect(formatMoney(15050, "en")).toBe("৳150.50");
    expect(formatMoney(15000, "en", { decimals: "always" })).toBe("৳150.00");
    expect(formatMoney(-45000, "en")).toBe("−৳450");
    expect(formatMoney(45000, "en", { signed: true })).toBe("+৳450");
  });
  it("round-trips with Bangla digit conversion", () => {
    expect(toAsciiDigits("৳১,২৩,৪৫৬")).toBe("৳1,23,456");
  });
});

describe("parseSignedAmount", () => {
  it("accepts a leading minus in either form, and Bangla digits", () => {
    expect(parseSignedAmount("-500")).toBe(-50000); // −৳500
    expect(parseSignedAmount("−১২০.৫০")).toBe(-12050);
    expect(parseSignedAmount("250")).toBe(25000);
    expect(parseSignedAmount("0")).toBe(0);
  });
  it("rejects junk", () => {
    expect(parseSignedAmount("--5")).toBeNull();
    expect(parseSignedAmount("")).toBeNull();
  });
});
