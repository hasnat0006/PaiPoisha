/**
 * Google sign-in and sign-out (spec §1). The session lives in localStorage via supabase-js:
 * no cookies, no server. Loaded lazily by the welcome page, the More tab and /auth/callback/.
 */
import { db } from "@/db/db";
import { supabase } from "@/lib/supabase";
import { pendingCount } from "./engine";
import { WELCOME_KEY } from "@/lib/welcome";
import { syncNow } from "./runner";

/** Leaves the app for Google; it comes back to /auth/callback/. */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback/` },
  });
  if (error) throw error;
}

/** On /auth/callback/: waits until supabase-js has swapped Google's code for a session (none if the user backed out). */
export async function finishSignIn(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** Changes that would be lost by signing out now (after a last try to upload them). */
export async function unsyncedAfterSync(): Promise<number> {
  await syncNow().catch(() => {});
  return pendingCount();
}

/**
 * Sign out, then wipe this phone so the next person sees nothing (spec §10). Uploading first is
 * the caller's job (`unsyncedAfterSync`). `scope: "local"` works offline; the server session expires on its own.
 */
export async function signOutAndWipe(go: (url: string) => void = (url) => window.location.replace(url)): Promise<void> {
  await supabase?.auth.signOut({ scope: "local" });
  await db.delete();
  try {
    localStorage.removeItem(WELCOME_KEY);
  } catch {
    /* private mode */
  }
  go("/");
}
