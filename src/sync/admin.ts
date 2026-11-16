/**
 * Feature suggestions and the admin dashboard (migration 0007). The admin side sees totals only:
 * admin_stats() never returns a name, email, amount or note. Loaded lazily, like auth.ts.
 */
import { supabase } from "@/lib/supabase";

export type SuggestionStatus = "new" | "planned" | "done" | "declined";
export interface Suggestion {
  id: string;
  title: string;
  body: string;
  status: SuggestionStatus;
  created_at: string;
}
export interface DayStats {
  day: string; // YYYY-MM-DD, Dhaka
  sign_ups: number;
  sign_ins: number;
  active: number;
  entries: number;
}
export interface AdminStats {
  users: number;
  new_users: number;
  active_today: number;
  active_7: number;
  active_30: number;
  entries: number;
  multi_wallet_users: number;
  budget_users: number;
  new_suggestions: number;
  daily: DayStats[];
}

const client = () => {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
};
const ok = <T>({ data, error }: { data: T; error: unknown }): T => {
  if (error) throw error;
  return data;
};

const TRACKED_KEY = "mm.tracked";
const dhakaDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

/** Marks this user active today (once a day per phone); a sign-in always counts. Never throws: it is only a count. */
export async function track(userId: string, signIn = false): Promise<void> {
  const mark = `${dhakaDay()} ${userId}`;
  try {
    if (!signIn && localStorage.getItem(TRACKED_KEY) === mark) return;
    const { error } = await client().rpc("track", { p_sign_in: signIn });
    if (!error) localStorage.setItem(TRACKED_KEY, mark);
  } catch {
    /* offline or private mode: try again next sync */
  }
}

/** Tracks a sign-in that just finished (the session's user). */
export async function trackSignIn(): Promise<void> {
  const { data } = await client().auth.getSession();
  if (data.session) await track(data.session.user.id, true);
}

export async function sendSuggestion(title: string, body: string): Promise<void> {
  ok(await client().from("feature_suggestions").insert({ title: title.trim(), body: body.trim() }));
}

export async function isAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  return ok(await supabase.rpc("is_admin")) === true;
}

export async function adminStats(days: number): Promise<AdminStats> {
  return ok(await client().rpc("admin_stats", { p_days: days })) as AdminStats;
}

export async function listSuggestions(): Promise<Suggestion[]> {
  return ok(
    await client().from("feature_suggestions").select("id,title,body,status,created_at").order("created_at", { ascending: false }).limit(500),
  ) as Suggestion[];
}

export async function setSuggestionStatus(id: string, status: SuggestionStatus): Promise<void> {
  ok(await client().from("feature_suggestions").update({ status }).eq("id", id));
}
