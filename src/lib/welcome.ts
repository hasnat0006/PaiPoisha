/**
 * Whether to show the bilingual welcome page (spec §1, user's choice 2026-11-08): only on a
 * brand-new phone (no entries yet), not signed in, Skip not tapped, and only when login exists.
 * "wait" = not known yet; render nothing rather than flash Home first.
 */
export const WELCOME_KEY = "mm.welcome"; // localStorage: "skipped" once Skip is tapped; cleared on sign-out
export interface WelcomeInputs {
  configured: boolean; // Supabase keys present
  onCallback: boolean; // on /auth/callback/
  skipped: boolean | null; // null = localStorage not read yet
  entries: number | undefined; // undefined = still counting
  known: boolean; // session checked
  signedIn: boolean;
}

export function welcomeGate(w: WelcomeInputs): "show" | "wait" | "hide" {
  if (!w.configured || w.onCallback || w.skipped || (w.entries ?? 0) > 0) return "hide";
  if (w.skipped === null || w.entries === undefined || !w.known) return "wait";
  return w.signedIn ? "hide" : "show";
}
