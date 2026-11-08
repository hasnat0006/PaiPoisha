// More tab → Account (spec §8): signed out = "Not backed up" + Google; signed in = email, sync status, Sync now, Sign out.
"use client";

import { RefreshCw, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { syncConfigured, useSyncStatus } from "@/sync/status";
import { GoogleButton } from "./GoogleButton";
import { SignOutDialog } from "./SignOutDialog";
import { useSyncLine } from "./useSyncLine";

const syncNow = () => void import("@/sync/runner").then((m) => m.syncNow());

export function AccountSection({ row }: { row: string }) {
  const t = useTranslations("account");
  const { state, email } = useSyncStatus();
  const line = useSyncLine();
  if (!syncConfigured()) return null; // a build without Supabase keys runs local-only

  return (
    <section aria-label={t("title")} className="rounded-xl border">
      <h2 className="px-4 pt-3 text-sm font-medium text-muted-foreground">{t("title")}</h2>
      {state === "signed_out" ? (
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm">{line}</p>
          <GoogleButton />
        </div>
      ) : (
        <ul className="divide-y">
          <li className={row}>
            <UserRound className="size-5" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{email}</span>
              <span className={`text-sm ${state === "error" ? "text-destructive" : "text-muted-foreground"}`} role="status">
                {line}
              </span>
            </span>
          </li>
          <li>
            <button type="button" className={row} onClick={syncNow} disabled={state === "syncing"}>
              <RefreshCw className={`size-5 ${state === "syncing" ? "animate-spin" : ""}`} aria-hidden />
              <span className="flex-1">{t("syncNow")}</span>
            </button>
          </li>
          <li>
            <SignOutDialog className={row} />
          </li>
        </ul>
      )}
    </section>
  );
}
