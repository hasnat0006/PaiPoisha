import { describe, expect, it } from "vitest";
import bn from "@/messages/bn.json";
import en from "@/messages/en.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("translations", () => {
  it("bn.json and en.json have exactly the same keys", () => {
    expect(keys(bn).sort()).toEqual(keys(en).sort());
  });
  it("no empty strings", () => {
    for (const [name, file] of Object.entries({ bn, en })) {
      const empty = keys(file).filter((k) => {
        const v = k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], file);
        return typeof v === "string" && v.trim() === "";
      });
      expect(empty, `${name}.json`).toEqual([]);
    }
  });
});
