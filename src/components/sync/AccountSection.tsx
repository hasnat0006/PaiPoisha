// More tab → Account (spec §8): signed out = "Not backed up" + Google; signed in = email, sync status, Sync now, Sign out.
"use client";

import { RefreshCw, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { notify } from "@/components/common/notify";
import { getStatus, syncConfigured, useSyncStatus } from "@/sync/status";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { GoogleButton } from "./GoogleButton";
import { SignOutDialog } from "./SignOutDialog";
import { useSyncLine } from "./useSyncLine";
import { SYNC_TOAST_ID, syncNow } from "./useSyncToasts";

export function AccountSection({ row }: { row: string }) {
  const t = useTranslations("account");
  const tAll = useTranslations();
  const { state, email, avatar, lastError } = useSyncStatus();
  /** "Sync now" always answers with a toast (user, 2026-11-08). */
  const onSyncNow = async () => {
    if (!navigator.onLine) return void notify.error(tAll("welcome.needsInternet"), { id: SYNC_TOAST_ID });
    await syncNow();
    const s = getStatus();
    if (s.state === "up_to_date" && !s.lastError) notify.success(tAll("sync.syncedNow"), { id: SYNC_TOAST_ID });
    else if (s.state !== "signed_out") notify.error(tAll("sync.failed", { reason: s.lastError ?? "" }), { id: SYNC_TOAST_ID });
  };
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
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- static export: next/image would need a server
              <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-9 shrink-0 rounded-full" />
            ) : (
              <UserRound className="size-5" aria-hidden />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{email}</span>
              <span className={`text-sm ${state === "error" ? "text-destructive" : "text-muted-foreground"}`} role="status">
                {line}
              </span>
              {state === "error" && lastError && <span className="break-words text-xs text-muted-foreground">{lastError}</span>}
            </span>
          </li>
          <li>
            <button type="button" className={row} onClick={() => void onSyncNow()}>
              <RefreshCw className={`size-5 ${state === "syncing" ? "animate-spin" : ""}`} aria-hidden />
              <span className="flex-1">{t("syncNow")}</span>
            </button>
          </li>
          <li>
            <SignOutDialog className={row} />
          </li>
          <li>
            <DeleteAccountDialog className={row} />
          </li>
        </ul>
      )}
    </section>
  );
}
