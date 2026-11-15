// iPhone Shortcut key: the personal key the ready-made Shortcut needs (it saves an expense without opening
// the app, migration 0003). Signed-in users only.
// shortcut: not shown anywhere since 2026-11-15 (user: More shows only the home-screen guide for now); put it back
// in a sheet when the iPhone Shortcut (step 8b) ships.
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { notify } from "@/components/common/notify";
import { Button } from "@/components/ui/button";
import { syncConfigured, useSyncStatus } from "@/sync/status";

/** iCloud link of the ready-made Shortcut; empty until it's published (the Install button hides). */
export const SHORTCUT_URL = "";

/** The iPhone path needs the server; a local-only build has none. */
export const iosShortcutAvailable = syncConfigured;

/** "Make my key" → the key, shown once, to copy. Signed out: a sign-in hint instead. */
export function ShortcutKey() {
  const t = useTranslations("shortcut");
  const { state } = useSyncStatus();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  if (state === "signed_out") return <p className="text-sm text-muted-foreground">{t("signIn")}</p>;

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
    <div className="flex flex-col gap-2">
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
      <p className="text-sm text-muted-foreground">{t("keyNote")}</p>
    </div>
  );
}
