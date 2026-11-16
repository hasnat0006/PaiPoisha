// Settings → "Suggest a feature": a sheet with a title and a description, sent to the admin dashboard (migration 0007).
// Signed-in only (user, 2026-11-16): stops spam; the admin never sees who sent it.
"use client";

import { ChevronRight, Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/components/common/notify";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useSyncStatus } from "@/sync/status";

const TITLE_MAX = 100; // same limits as the table's checks (0007_admin.sql)
const BODY_MAX = 1000;
const field = "w-full rounded-lg border bg-background px-3 text-base";

export function SuggestFeature({ className }: { className: string }) {
  const t = useTranslations("suggest");
  const signedIn = useSyncStatus().state !== "signed_out";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const short = title.trim().length < 3;

  const send = async () => {
    if (short) return void notify.error(t("titleShort"));
    if (!navigator.onLine) return void notify.error(t("offline"));
    setBusy(true);
    try {
      await (await import("@/sync/admin")).sendSuggestion(title, body);
      notify.success(t("sent"));
      setTitle("");
      setBody("");
      setOpen(false);
    } catch {
      notify.error(t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <Lightbulb className="size-5" aria-hidden />
        <span className="flex-1">{t("row")}</span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg">{t("title")}</DrawerTitle>
            <DrawerDescription>{signedIn ? t("intro") : t("signInFirst")}</DrawerDescription>
          </DrawerHeader>
          {signedIn && (
            <div className="flex flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <label className="flex flex-col gap-1 text-sm">
                {t("titleLabel")}
                <input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder={t("titleHint")} className={`${field} min-h-11`} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t("bodyLabel")}
                <textarea value={body} maxLength={BODY_MAX} rows={5} onChange={(e) => setBody(e.target.value)} placeholder={t("bodyHint")} className={`${field} py-2`} />
              </label>
              <Button className="min-h-11 text-base" disabled={busy || short} onClick={send}>
                {busy ? t("sending") : t("send")}
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
