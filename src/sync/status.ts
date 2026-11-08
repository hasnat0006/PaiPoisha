/**
 * Sync status that the UI reads (spec §10 table): a tiny store with no Supabase import,
 * so screens can show the status without loading supabase-js. The runner writes it.
 */
import { useSyncExternalStore } from "react";
import type { Settings } from "@/db/types";

export type SyncState = "up_to_date" | "syncing" | "offline_pending" | "error" | "signed_out";

export interface SyncStatus {
  state: SyncState;
  /** False until the runner has checked for a saved session (the welcome page waits for it). */
  known: boolean;
  email: string | null;
  pending: number; // local rows waiting to upload
  lastSyncedAt: string | null;
}

/** What the first sync of an account on this phone did (spec §1 merge). */
export interface MergeResult {
  added: number; // entries from this phone that join the account
  hadCloud: boolean; // the account already had data
  settings: Settings | null; // the account's settings, applied on this phone
}

/** Login and sync need both public env vars; without them the app runs local-only. */
export const syncConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const INITIAL: SyncStatus = { state: "signed_out", known: false, email: null, pending: 0, lastSyncedAt: null };
let status = INITIAL;
const listeners = new Set<() => void>();
const mergeListeners = new Set<(r: MergeResult) => void>();

export const getStatus = () => status;
export function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export const useSyncStatus = () => useSyncExternalStore(subscribe, getStatus, () => INITIAL);

export function onMerged(fn: (r: MergeResult) => void) {
  mergeListeners.add(fn);
  return () => void mergeListeners.delete(fn);
}
export const emitMerged = (r: MergeResult) => mergeListeners.forEach((fn) => fn(r));
