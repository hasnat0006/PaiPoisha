// More tab: the quick-add link to copy, and how to put an Android home-screen shortcut on it (spec §9). iOS Shortcut: later.
"use client";

import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function QuickAddHelp() {
  const t = useTranslations("quickAdd");
  const [link, setLink] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the origin is only known in the browser
  useEffect(() => setLink(`${window.location.origin}/add/?type=expense&amount=`), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("copied"), { duration: 1500 });
    } catch {
      toast(t("copyManually")); // clipboard needs HTTPS; the link stays selectable below
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="flex items-center gap-2 text-base font-medium">
        <Zap className="size-5" aria-hidden />
        {t("title")}
      </h2>
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
    </section>
  );
}
