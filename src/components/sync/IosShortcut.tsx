// More tab → Quick add → iPhone Shortcut: make a personal key, install the ready-made Shortcut,
// which saves an expense without opening the app (migration 0003). Signed-in users only.
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { notify } from "@/components/common/notify";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { syncConfigured, useSyncStatus } from "@/sync/status";

/** iCloud link of the ready-made Shortcut; empty until it's published (the Install button hides). */
export const SHORTCUT_URL = "";

export function IosShortcut() {
  const t = useTranslations("shortcut");
  const { state } = useSyncStatus();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  if (!syncConfigured()) return null; // local-only build: no server to save to

  const makeKey = async () => {
    if (!navigator.onLine) return void notify.error(t("keyError"));
    setBusy(true);
    try {
      setKey(await (await import("@/sync/shortcutKey")).newShortcutKey());
    } catch {
      notify.error(t("keyError"));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      notify.success(t("copied"));
    } catch {
      toast(t("copyManually"));
    }
  };

  return (
    <details className="text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t("title")}</summary>
      <div className="flex flex-col gap-3 text-muted-foreground">
        <p>{t("intro")}</p>
        {state === "signed_out" ? (
          <p>{t("signIn")}</p>
        ) : (
          <>
            <p>{t("step1")}</p>
            {key ? (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={key}
                  aria-label={t("keyLabel")}
                  onFocus={(e) => e.target.select()}
                  className="min-h-11 min-w-0 flex-1 rounded-md border bg-muted px-2 font-mono text-xs text-foreground"
                />
                <Button variant="outline" className="min-h-11 shrink-0 px-4" onClick={copy}>
                  {t("copy")}
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void makeKey()}>
                {t("makeKey")}
              </Button>
            )}
            <p>{t("keyNote")}</p>
            <p>{t("step2")}</p>
            {SHORTCUT_URL && (
              <a href={SHORTCUT_URL} target="_blank" rel="noreferrer" className={cn(buttonVariants(), "min-h-11")}>
                {t("install")}
              </a>
            )}
            <p>{t("step3")}</p>
          </>
        )}
      </div>
    </details>
  );
}
