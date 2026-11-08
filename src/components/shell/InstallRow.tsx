// "Install app" row for the More tab: Android gets the real prompt, iPhone gets Share → Add to Home Screen steps.
"use client";

import { Download, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useInstall } from "@/features/pwa/usePwa";

export function InstallRow({ className }: { className: string }) {
  const t = useTranslations("pwa");
  const { state, install } = useInstall();

  if (state === "prompt") {
    return (
      <li>
        <button type="button" className={className} onClick={install}>
          <Download className="size-5" aria-hidden />
          <span className="flex-1">{t("install")}</span>
        </button>
      </li>
    );
  }
  if (state === "ios") {
    return (
      <li className="flex gap-3 px-4 py-3 text-base">
        <Share className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span>
          <span className="block">{t("install")}</span>
          <span className="block text-sm text-muted-foreground">{t("iosSteps")}</span>
        </span>
      </li>
    );
  }
  return null; // already installed, or the browser can't install apps
}
