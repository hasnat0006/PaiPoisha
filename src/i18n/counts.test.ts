import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import bn from "@/messages/bn.json";
import { numberFormats } from "./provider";

describe("counts in Bangla messages", () => {
  const t = (banglaDigits: boolean) => createTranslator({ locale: "bn", messages: bn, formats: numberFormats(banglaDigits) });
  it("uses Bangla digits when they're on", () => {
    expect(t(true)("transactions.count", { count: 166 })).toBe("১৬৬টি হিসাব");
  });
  it("uses English digits when they're off", () => {
    expect(t(false)("transactions.count", { count: 166 })).toBe("166টি হিসাব");
  });
});
