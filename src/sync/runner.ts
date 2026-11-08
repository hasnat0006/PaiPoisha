/**
 * When sync runs (spec §10): app start, back to the foreground, back online, ~3 s after a
 * local change, sign-in, and "Sync now". One cycle at a time; extra calls queue one follow-up.
 * A failure retries after 5 s, 30 s, then 2 min; the status shows Error only after the third.
 * Loaded lazily by the app shell, so supabase-js stays out of the first-load bundle.
 */
import { onLocalWrite } from "@/db/repo";
import { supabase } from "@/lib/supabase";
import { pendingCount, syncOnce } from "./engine";
import { supabaseRemote, type Remote } from "./remote";
import { emitMerged, getStatus, setStatus } from "./status";

export const RETRY_MS = [5_000, 30_000, 120_000];
export const DEBOUNCE_MS = 3_000;

/** Supabase errors are plain objects with `message` (and often `code`), not Error instances. */
export function errorText(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const { message, code } = err as { message: unknown; code?: unknown };
    return code ? `${String(message)} (${String(code)})` : String(message);
  }
  return String(err);
}

export function createRunner(remote: Remote) {
  let current: Promise<void> | null = null;
  let queued: Promise<void> | null = null;
  let fails = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  /** Refresh the waiting count, and pick Up to date / Offline for a signed-in user who isn't mid-sync. */
  const settle = async () => {
    const pending = await pendingCount();
    const { state } = getStatus();
    if (state === "signed_out" || state === "syncing" || (state === "error" && navigator.onLine)) return setStatus({ pending });
    setStatus({ pending, state: !navigator.onLine && pending > 0 ? "offline_pending" : "up_to_date" });
  };

  async function cycle() {
    clearTimeout(retryTimer);
    // Who is signed in comes from the saved session, without the network, so screens know at once.
    // An error means a session exists but its token can't refresh yet: still signed in.
    const user = await remote.user().catch(() => undefined);
    if (user === null) {
      setStatus({ state: "signed_out", known: true, email: null });
      return settle();
    }
    setStatus({ known: true, state: navigator.onLine ? "syncing" : "up_to_date", ...(user && { email: user.email }) });
    if (!navigator.onLine) return settle(); // the "online" event starts the next try
    try {
      const res = await syncOnce(remote, user);
      fails = 0;
      if (!res.signedIn) setStatus({ state: "signed_out", email: null });
      else {
        setStatus({ state: "up_to_date", email: res.email, lastSyncedAt: new Date().toISOString(), lastError: null });
        if (res.merged) emitMerged(res.merged);
      }
    } catch (err) {
      fails += 1;
      // Keep spinning while retrying: never show "Synced" for a sync that failed (it hid a failing first sync).
      setStatus({ state: fails >= RETRY_MS.length ? "error" : "syncing", lastError: errorText(err) });
      if (fails <= RETRY_MS.length) retryTimer = setTimeout(() => void run(), RETRY_MS[fails - 1]);
    }
    await settle();
  }

  /** Resolves once a cycle that started after this call has finished. */
  function run(): Promise<void> {
    if (current) return (queued ??= current.then(() => ((queued = null), run())));
    current = cycle().finally(() => (current = null));
    return current;
  }

  /** "Sync now" / "Tap to retry": starts the retry schedule over. */
  const syncNow = () => {
    fails = 0;
    return run();
  };

  return { run, syncNow, settle };
}

let runner: ReturnType<typeof createRunner> | null = null;

/** Call once from the app shell. Returns a cleanup for the listeners. */
export function startSync(): () => void {
  if (!supabase || runner) return () => {};
  const r = (runner = createRunner(supabaseRemote(supabase)));
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const onVisible = () => document.visibilityState === "visible" && void r.run();
  const onOnline = () => void r.run();
  const onOffline = () => void r.settle();
  const offWrite = onLocalWrite(() => {
    void r.settle(); // keep "4 changes will sync later" current
    clearTimeout(debounce);
    debounce = setTimeout(() => void r.run(), DEBOUNCE_MS);
  });
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") setTimeout(() => void r.run(), 0); // outside the auth callback, as supabase-js advises
  });
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  void r.run();
  return () => {
    offWrite();
    data.subscription.unsubscribe();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    clearTimeout(debounce);
    runner = null;
  };
}

/** For the More tab: "Sync now", "Tap to retry", and the push before sign-out. */
export const syncNow = () => runner?.syncNow() ?? Promise.resolve();
