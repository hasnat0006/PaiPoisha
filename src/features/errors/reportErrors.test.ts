// Crash report text: short, no site address, no emails, and nothing for errors that carry no details.
import { describe, expect, it } from "vitest";
import { describeError } from "./reportErrors";

const origin = "https://paipoisha.vercel.app";

describe("describeError", () => {
  it("keeps the name, message and the app frame, without the site address", () => {
    const e = new TypeError("x is undefined");
    e.stack = `TypeError: x is undefined\n    at foo (${origin}/_next/static/chunks/app.js:1:200)\n    at bar (${origin}/b.js:2:3)`;
    expect(describeError(e, origin)).toBe("TypeError: x is undefined @ foo (/_next/static/chunks/app.js:1:200)");
  });
  it("hides email addresses", () => expect(describeError(new Error("bad user a.b@gmail.com"), origin)).toBe("Error: bad user [email]"));
  it("skips errors with no details", () => {
    expect(describeError("Script error.", origin)).toBeNull();
    expect(describeError(new Error("ResizeObserver loop completed with undelivered notifications."), origin)).toBeNull();
    expect(describeError(undefined, origin)).toBeNull();
  });
  it("cuts long text", () => expect(describeError("x".repeat(900), origin)).toHaveLength(500));
});
