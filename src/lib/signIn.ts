/**
 * How a Google sign-in came back to /auth/callback/ (spec §1: backing out of Google shows no error).
 * Supabase reports errors as ?error=… (or #error=…); a user who backs out comes back with error=access_denied.
 */
export function signInOutcome(search: string, hash: string, hasSession: boolean): "ok" | "cancelled" | "failed" {
  if (hasSession) return "ok";
  const params = new URLSearchParams(search);
  new URLSearchParams(hash.replace(/^#/, "")).forEach((v, k) => params.set(k, v));
  const error = params.get("error");
  if (error === "access_denied") return "cancelled";
  return error || params.get("code") ? "failed" : "cancelled"; // a code that didn't become a session is a failure
}
