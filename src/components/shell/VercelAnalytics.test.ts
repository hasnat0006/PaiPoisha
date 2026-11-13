import { describe, expect, it } from "vitest";
import { withoutQuery } from "./VercelAnalytics";

describe("analytics privacy", () => {
  it("never sends query strings or hashes (quick-add links carry amounts and notes)", () => {
    const e = withoutQuery({ type: "pageview", url: "https://paipoisha.vercel.app/add/?amount=150&note=rickshaw#x" });
    expect(e.url).toBe("https://paipoisha.vercel.app/add/");
  });
});
