/**
 * Anonymous crash reports (migration 0008): when the app breaks on someone's phone, the error text,
 * the page path and the browser go to Supabase and show on the admin dashboard. No user id, no entry data.
 * supabase-js is loaded only when an error happens, so it stays out of the first-load bundle.
 */

const MAX_PER_SESSION = 5;

/** One line for an error: its name and message plus where it was thrown, without the site address or emails. */
export function describeError(err: unknown, origin: string): string | null {
  const e = err instanceof Error ? err : null;
  const text = e ? `${e.name}: ${e.message}` : typeof err === "string" ? err : err == null ? "" : String(err);
  if (!text || text === "Script error." || /ResizeObserver loop/.test(text)) return null; // no details, or harmless
  const frame = e?.stack?.split("\n").find((l) => l.includes(origin))?.trim();
  const where = frame ? ` @ ${frame.replace(/^at\s+/, "").split(origin).join("")}` : "";
  return `${text}${where}`.replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, "[email]").slice(0, 500);
}

/** Call once from the app shell; returns a cleanup. Does nothing in development or without Supabase. */
export function startErrorReports(): () => void {
  if (process.env.NODE_ENV !== "production" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return () => {};
  const sent = new Set<string>();
  const report = (err: unknown) => {
    const message = describeError(err, location.origin);
    if (!message || sent.has(message) || sent.size >= MAX_PER_SESSION) return;
    sent.add(message);
    import("@/lib/supabase")
      .then(({ supabase }) => supabase?.rpc("report_error", { p_message: message, p_page: location.pathname, p_browser: navigator.userAgent }))
      .catch(() => {}); // offline: this one is lost, which is fine for a crash count
  };
  const onError = (e: ErrorEvent) => report(e.error ?? e.message);
  const onRejection = (e: PromiseRejectionEvent) => report(e.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
