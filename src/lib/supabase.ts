/**
 * Supabase client for the browser. Only the public anon key is used here;
 * Row Level Security protects every table. NEVER put the service_role key in
 * this app or in any NEXT_PUBLIC_ variable.
 *
 * Returns null when env vars are missing, so the app still runs fully offline
 * (local-only mode) during early development.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
