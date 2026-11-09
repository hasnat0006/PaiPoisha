/**
 * iOS Shortcut key (migration 0003): asks the server for a new personal key, replacing the old
 * one. The server keeps only its hash, so the app shows it once. Loaded lazily by the More tab.
 */
import { supabase } from "@/lib/supabase";

export async function newShortcutKey(): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("shortcut_new_key");
  if (error) throw error;
  return data as string;
}
