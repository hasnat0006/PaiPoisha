// "Delete my account and data" (spec §11 Privacy): confirms, deletes the account on the server, then wipes this phone.
"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/components/common/notify";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteAccountDialog({ className }: { className: string }) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!navigator.onLine) return void notify.error(t("welcome.needsInternet"));
    setBusy(true);
    try {
      await (await import("@/sync/auth")).deleteAccountAndWipe(); // reloads the app
    } catch {
      notify.error(t("account.deleteError"));
      setBusy(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <button type="button" className={`${className} text-destructive`}>
            <Trash2 className="size-5" aria-hidden />
            <span className="flex-1">{t("account.delete")}</span>
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("account.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("account.deleteBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" className="min-h-11" disabled={busy} onClick={remove}>
            {busy ? t("account.deleting") : t("account.deleteConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
