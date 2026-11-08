// Bilingual welcome page for a brand-new phone (spec §1): pick a language, then Continue with Google or Skip.
"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/sync/GoogleButton";
import { saveSettings } from "@/features/settings/settingsActions";
import { useLocale } from "@/i18n/provider";
import type { Locale } from "@/lib/money";

const LANGS = [
  { id: "bn", key: "bangla" },
  { id: "en", key: "english" },
] as const satisfies { id: Locale; key: string }[];

export function Welcome({ onSkip }: { onSkip: () => void }) {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const pick = (l: Locale) => {
    setLocale(l);
    saveSettings({ bangla_digits: l === "bn" }, l).catch(() => {}); // recorded for sync; the choice itself is already stored
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div role="group" aria-label={t("settings.language")} className="grid grid-cols-2 gap-2">
        {LANGS.map(({ id, key }) => (
          <button
            key={id}
            type="button"
            aria-pressed={locale === id}
            onClick={() => pick(id)}
            className="min-h-11 rounded-lg border text-base aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {t(`settings.${key}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export: no image optimisation */}
        <img src="/icons/icon-192.png" alt="" width={96} height={96} className="rounded-2xl" />
        <h1 className="text-3xl font-semibold">{t("app.name")}</h1>
        <p className="text-muted-foreground">{t("app.tagline")}</p>
        <ul className="mt-2 flex flex-col gap-2 text-left">
          {(["point1", "point2", "point3"] as const).map((k) => (
            <li key={k} className="flex items-start gap-2">
              <Check className="mt-1 size-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
              {t(`welcome.${k}`)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-center text-sm text-muted-foreground">{t("welcome.safe")}</p>
        <GoogleButton />
        <Button variant="ghost" className="min-h-11 text-base" onClick={onSkip}>
          {t("welcome.skip")}
        </Button>
      </div>
    </main>
  );
}
