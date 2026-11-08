// Sign out with confirmation (spec §1, §10). It first tries to upload; if changes are still waiting, it says so.
"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
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
import { getStatus } from "@/sync/status";

export function SignOutDialog({ className }: { className: string }) {
  const t = useTranslations();
  const [unsynced, setUnsynced] = useState<number | null>(null); // null = still checking
  const [busy, setBusy] = useState(false);

  const onOpenChange = (open: boolean) => {
    if (!open) return;
    setUnsynced(null);
    import("@/sync/auth")
      .then((m) => m.unsyncedAfterSync())
      .then(setUnsynced, () => setUnsynced(getStatus().pending));
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await (await import("@/sync/auth")).signOutAndWipe(); // reloads the app
    } catch {
      toast.error(t("account.signOutError"));
      setBusy(false);
    }
  };

  return (
    <AlertDialog onOpenChange={onOpenChange}>
      <AlertDialogTrigger
        render={
          <button type="button" className={className}>
            <LogOut className="size-5" aria-hidden />
            <span className="flex-1">{t("account.signOut")}</span>
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("account.signOutTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {unsynced === null ? t("account.checking") : unsynced > 0 ? t("account.signOutUnsynced", { count: unsynced }) : t("account.signOutBody")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" className="min-h-11" disabled={unsynced === null || busy} onClick={signOut}>
            {unsynced ? t("account.signOutAnyway") : t("account.signOut")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
