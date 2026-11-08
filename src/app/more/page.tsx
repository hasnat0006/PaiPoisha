"use client";

// More tab: Wallets, Categories, the settings of spec §8 (language, digits, theme, month start day), install, quick-add link.
import { CalendarDays, ChevronRight, Hash, Languages, Shapes, SunMoon, Wallet } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { InstallRow } from "@/components/shell/InstallRow";
import { QuickAddHelp } from "@/components/shell/QuickAddHelp";
import type { Theme } from "@/db/types";
import { useEntries } from "@/features/entries/useEntries";
import { saveSettings, setMonthStartDay } from "@/features/settings/settingsActions";
import { useLocale } from "@/i18n/provider";
import { toBanglaDigits } from "@/lib/money";

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const THEMES = [
  { id: "light", key: "themeLight" },
  { id: "dark", key: "themeDark" },
  { id: "system", key: "themeSystem" },
] as const satisfies { id: Theme; key: string }[];

const row = "flex min-h-14 w-full items-center gap-3 px-4 text-left text-base";

export default function MorePage() {
  const t = useTranslations();
  const { locale, setLocale, ready, banglaDigits, setBanglaDigits } = useLocale();
  const { theme, setTheme } = useTheme();
  const state = useEntries(ready ? t("entries.cashWallet") : null);
  const saveError = () => toast.error(t("wallets.saveError"));
  const changeStartDay = (day: number) => setMonthStartDay(day, locale).catch(saveError);
  const changeLanguage = () => {
    const l = locale === "bn" ? "en" : "bn";
    setLocale(l);
    saveSettings({ bangla_digits: l === "bn" }, l).catch(saveError);
  };
  const changeDigits = () => {
    setBanglaDigits(!banglaDigits);
    saveSettings({ bangla_digits: !banglaDigits }, locale).catch(saveError);
  };
  const changeTheme = (id: Theme) => {
    setTheme(id);
    saveSettings({ theme: id }, locale).catch(saveError);
  };
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">{t("nav.more")}</h1>
      <ul className="divide-y rounded-xl border">
        <li>
          <Link href="/wallets/" className={row}>
            <Wallet className="size-5" aria-hidden />
            <span className="flex-1">{t("wallets.title")}</span>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
          </Link>
        </li>
        <li>
          <Link href="/categories/" className={row}>
            <Shapes className="size-5" aria-hidden />
            <span className="flex-1">{t("categories.title")}</span>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
          </Link>
        </li>
        <li>
          <button type="button" className={row} onClick={changeLanguage}>
            <Languages className="size-5" aria-hidden />
            <span className="flex-1">{t("settings.language")}</span>
            <span className="text-muted-foreground">{locale === "bn" ? t("settings.bangla") : t("settings.english")}</span>
          </button>
        </li>
        <li>
          <button type="button" className={row} onClick={changeDigits}>
            <Hash className="size-5" aria-hidden />
            <span className="flex-1">{t("settings.digits")}</span>
            <span className="text-muted-foreground">{banglaDigits ? t("settings.digitsBangla") : t("settings.digitsEnglish")}</span>
          </button>
        </li>
        <li className="flex flex-col gap-2 px-4 py-3">
          <span className="flex items-center gap-3 text-base">
            <SunMoon className="size-5" aria-hidden />
            {t("settings.theme")}
          </span>
          <div role="group" aria-label={t("settings.theme")} className="grid grid-cols-3 gap-2">
            {THEMES.map(({ id, key }) => (
              <button
                key={id}
                type="button"
                aria-pressed={ready && theme === id} // theme is unknown in the static HTML; wait for mount
                onClick={() => changeTheme(id)}
                className="min-h-11 rounded-lg border px-2 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {t(`settings.${key}`)}
              </button>
            ))}
          </div>
        </li>
        <li>
          <label className={row}>
            <CalendarDays className="size-5" aria-hidden />
            <span className="flex-1">{t("settings.monthStart")}</span>
            <select
              className="min-h-11 rounded-lg border bg-background px-2 text-base tabular-nums"
              value={state.status === "ready" ? state.startDay : 1}
              disabled={state.status !== "ready"}
              onChange={(e) => changeStartDay(Number(e.target.value))}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>{banglaDigits ? toBanglaDigits(String(d)) : d}</option>
              ))}
            </select>
          </label>
        </li>
        <InstallRow className={row} />
      </ul>
      <QuickAddHelp />
    </main>
  );
}
