// Loads the admin dashboard: who may see it, the totals for the chosen range, and the suggestions.
// Development builds without Supabase show made-up numbers so the layout can be checked (never shipped).
"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminStats, Suggestion, SuggestionStatus } from "@/sync/admin";
import { syncConfigured } from "@/sync/status";

export type AdminState =
  | { status: "loading" }
  | { status: "denied" } // signed out, not an admin, or no Supabase
  | { status: "error" }
  | { status: "ready"; stats: AdminStats; suggestions: Suggestion[] };

const demo = process.env.NODE_ENV === "development" && !syncConfigured();

async function load(days: number): Promise<AdminState> {
  if (demo) {
    const m = await import("@/components/dev/adminDemo");
    return { status: "ready", stats: m.demoStats(days), suggestions: m.DEMO_SUGGESTIONS };
  }
  const api = await import("@/sync/admin");
  if (!(await api.isAdmin())) return { status: "denied" };
  const [stats, suggestions] = await Promise.all([api.adminStats(days), api.listSuggestions()]);
  return { status: "ready", stats, suggestions };
}

export function useAdmin(days: number) {
  const [state, setState] = useState<AdminState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    load(days).then(
      (s) => live && setState(s),
      () => live && setState({ status: "error" }),
    );
    return () => {
      live = false;
    };
  }, [days, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((a) => a + 1);
  }, []);

  /** Changes a suggestion's status at once, and puts it back if the server refuses. */
  const setStatus = useCallback(async (id: string, next: SuggestionStatus) => {
    const patch = (to: (s: Suggestion) => SuggestionStatus) =>
      setState((st) => (st.status === "ready" ? { ...st, suggestions: st.suggestions.map((s) => (s.id === id ? { ...s, status: to(s) } : s)) } : st));
    let before: SuggestionStatus = next;
    patch((s) => ((before = s.status), next));
    if (demo) return;
    try {
      await (await import("@/sync/admin")).setSuggestionStatus(id, next);
    } catch (e) {
      patch(() => before);
      throw e;
    }
  }, []);

  return { state, retry, setStatus };
}
