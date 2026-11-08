import { describe, expect, it } from "vitest";
import { signInOutcome } from "./signIn";

describe("signInOutcome", () => {
  it("is ok when a session exists", () => expect(signInOutcome("?code=abc", "", true)).toBe("ok"));
  it("treats backing out of Google as a quiet cancel", () =>
    expect(signInOutcome("?error=access_denied&error_description=User+denied", "", false)).toBe("cancelled"));
  it("reports a real error from the query or the hash", () => {
    expect(signInOutcome("?error=server_error&error_code=unexpected_failure", "", false)).toBe("failed");
    expect(signInOutcome("", "#error=invalid_request&error_description=bad", false)).toBe("failed");
  });
  it("reports a code that didn't become a session", () => expect(signInOutcome("?code=abc", "", false)).toBe("failed"));
  it("is a quiet cancel when the page is opened with nothing", () => expect(signInOutcome("", "", false)).toBe("cancelled"));
});
