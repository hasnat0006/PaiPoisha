// Sync toasts (user, 2026-11-08): one red toast when sync turns to Error (the 3rd failure in a row), with Retry,
// and "Synced again" when it recovers. Background syncs stay quiet; being offline is not an error.
"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { notify } from "@/components/common/notify";
import { getStatus, useSyncStatus } from "@/sync/status";

export const SYNC_TOAST_ID = "sync"; // one slot: Sync now's result and these replace each other instead of stacking

export const syncNow = () => import("@/sync/runner").then((m) => m.syncNow());

export function useSyncToasts() {
  const t = useTranslations();
  const { state } = useSyncStatus();
  const previous = useRef(state);
  useEffect(() => {
    const was = previous.current;
    previous.current = state;
    if (state === "error" && was !== "error") {
      notify.error(t("sync.failed", { reason: getStatus().lastError ?? "" }), {
        id: SYNC_TOAST_ID,
        action: { label: t("common.retry"), onClick: () => void syncNow() },
      });
    } else if (was === "error" && state === "up_to_date") {
      notify.success(t("sync.recovered"), { id: SYNC_TOAST_ID });
    }
  }, [state, t]);
}
