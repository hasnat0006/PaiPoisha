// More tab: one "Quick add" row that opens a sheet with the quick-add link to copy, how to put an Android home-screen shortcut on it (spec §9), and the iPhone Shortcut.
"use client";

import { ChevronRight, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { notify } from "@/components/common/notify";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { IosShortcut } from "@/components/sync/IosShortcut";

export function QuickAddHelp({ className }: { className: string }) {
  const t = useTranslations("quickAdd");
  const [link, setLink] = useState("");
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the origin is only known in the browser
  useEffect(() => setLink(`${window.location.origin}/add/?type=expense&amount=`), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      notify.success(t("copied"));
    } catch {
      toast(t("copyManually")); // clipboard needs HTTPS; the link stays selectable below
    }
  };

  return (
    <li>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <Zap className="size-5" aria-hidden />
        <span className="flex-1">{t("title")}</span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg">{t("title")}</DrawerTitle>
          </DrawerHeader>
          <div className="flex max-h-[70dvh] flex-col gap-3 overflow-y-auto px-4 pb-6">
            <p className="text-sm text-muted-foreground">{t("intro")}</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                aria-label={t("title")}
                onFocus={(e) => e.target.select()}
                className="min-h-11 min-w-0 flex-1 rounded-lg border bg-muted px-2 text-sm"
              />
              <Button variant="outline" className="min-h-11 shrink-0 px-4" onClick={copy}>
                {t("copy")}
              </Button>
            </div>
            <details className="text-sm">
              <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t("androidTitle")}</summary>
              <p className="text-muted-foreground">{t("android")}</p>
            </details>
            <IosShortcut />
          </div>
        </DrawerContent>
      </Drawer>
    </li>
  );
}
