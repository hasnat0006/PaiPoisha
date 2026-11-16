import { describe, expect, it } from "vitest";
import { flipSign } from "./SignToggle";

describe("flipSign", () => {
  it("adds and removes the minus", () => {
    expect(flipSign("500")).toBe("-500");
    expect(flipSign(" -500 ")).toBe("500");
    expect(flipSign("−75.5")).toBe("75.5");
    expect(flipSign("")).toBe("-");
  });
});
