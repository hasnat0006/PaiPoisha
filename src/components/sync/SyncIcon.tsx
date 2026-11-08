// Small sync status icon for the Home header (spec §10); tapping it opens the Account section on More.
"use client";

import { CloudAlert, CloudCheck, CloudOff, CloudUpload, RefreshCw } from "lucide-react";
import Link from "next/link";
import { syncConfigured, useSyncStatus, type SyncState } from "@/sync/status";
import { useSyncLine } from "./useSyncLine";

const ICONS: Record<SyncState, typeof CloudCheck> = {
  up_to_date: CloudCheck,
  syncing: RefreshCw,
  offline_pending: CloudUpload,
  error: CloudAlert,
  signed_out: CloudOff,
};

export function SyncIcon() {
  const { state } = useSyncStatus();
  const line = useSyncLine();
  if (!syncConfigured()) return null;
  const Icon = ICONS[state];
  return (
    <Link href="/more/" aria-label={line} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground">
      <Icon className={`size-5 ${state === "syncing" ? "animate-spin" : ""} ${state === "error" ? "text-destructive" : ""}`} aria-hidden />
    </Link>
  );
}
