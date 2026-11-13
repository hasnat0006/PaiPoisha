/**
 * Google sign-in and sign-out (spec §1). The session lives in localStorage via supabase-js:
 * no cookies, no server. Loaded lazily by the welcome page, the More tab and /auth/callback/.
 */
import { db } from "@/db/db";
import { supabase } from "@/lib/supabase";
import { pendingCount } from "./engine";
import { DRAFT_KEY } from "@/features/entries/entryDraft";
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

/** Public by design (it is in every Google page); unset → the redirect flow above is used. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type GisCredential = { credential: string };
type Gis = {
  initialize(o: { client_id: string; callback: (r: GisCredential) => void; nonce: string; use_fedcm_for_prompt?: boolean }): void;
  renderButton(el: HTMLElement, o: Record<string, unknown>): void;
};

function loadGis(): Promise<Gis> {
  const get = () => (window as unknown as { google?: { accounts: { id: Gis } } }).google?.accounts.id;
  const ready = get();
  if (ready) return Promise.resolve(ready);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (get() ? resolve(get()!) : reject(new Error("gis")));
    s.onerror = () => reject(new Error("gis"));
    document.head.appendChild(s);
  });
}

/**
 * Google's own button (Identity Services): the sign-in window says "PaiPoisha" instead of the Supabase address.
 * `onDone(false)` = Supabase refused the token. Supabase wants the SHA-256 of our nonce in Google's token.
 */
export async function renderGoogleButton(el: HTMLElement, onDone: (ok: boolean) => void): Promise<void> {
  if (!supabase || !GOOGLE_CLIENT_ID) return;
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const nonce = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const gis = await loadGis();
  gis.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce,
    callback: async ({ credential }) => {
      const { error } = await supabase!.auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
      onDone(!error);
    },
  });
  gis.renderButton(el, {
    type: "standard",
    theme: document.documentElement.classList.contains("dark") ? "filled_black" : "outline",
    size: "large",
    text: "continue_with",
    width: Math.min(400, Math.max(200, el.clientWidth)),
  });
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

/** Deletes the account and all its cloud data (migration 0004), then wipes this phone. Needs internet. */
export async function deleteAccountAndWipe(go?: (url: string) => void): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
  await signOutAndWipe(go);
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
    localStorage.removeItem(DRAFT_KEY); // an unsaved amount or note must not show to the next person
  } catch {
    /* private mode */
  }
  go("/");
}
