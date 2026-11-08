import { describe, expect, it } from "vitest";
import { welcomeGate, type WelcomeInputs } from "./welcome";

const base: WelcomeInputs = { configured: true, onCallback: false, skipped: false, entries: 0, known: true, signedIn: false };

describe("welcomeGate", () => {
  it("shows on a brand-new, signed-out phone", () => expect(welcomeGate(base)).toBe("show"));
  it("hides once the phone has entries, without waiting for the session", () => expect(welcomeGate({ ...base, entries: 3, known: false })).toBe("hide"));
  it("hides after Skip", () => expect(welcomeGate({ ...base, skipped: true })).toBe("hide"));
  it("hides when signed in", () => expect(welcomeGate({ ...base, signedIn: true })).toBe("hide"));
  it("hides in a build without login", () => expect(welcomeGate({ ...base, configured: false })).toBe("hide"));
  it("hides on the sign-in callback page", () => expect(welcomeGate({ ...base, onCallback: true })).toBe("hide"));
  it("waits while the session or entry count is unknown", () => {
    expect(welcomeGate({ ...base, known: false })).toBe("wait");
    expect(welcomeGate({ ...base, entries: undefined })).toBe("wait");
    expect(welcomeGate({ ...base, skipped: null })).toBe("wait");
  });
});
