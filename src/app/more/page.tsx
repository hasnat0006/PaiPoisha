"use client";

// More tab: Account (sign-in, sync), Wallets, Categories, the settings of spec §8 (language, digits, theme, month start day), install, quick-add link.
import { CalendarDays, ChevronRight, Hash, Languages, Shapes, SunMoon, Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { notify } from "@/components/common/notify";
import { SwitchKnob } from "@/components/common/SwitchKnob";
import { InstallRow } from "@/components/shell/InstallRow";
import { AccountSection } from "@/components/sync/AccountSection";
import { QuickAddHelp } from "@/components/shell/QuickAddHelp";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { Theme } from "@/db/types";
import { useEntries } from "@/features/entries/useEntries";
import { saveSettings, setMonthStartDay } from "@/features/settings/settingsActions";
import { useLocale } from "@/i18n/provider";
import { toBanglaDigits } from "@/lib/money";

// Development builds only: the production build drops this branch, so the demo code is never shipped.
const DemoDataSection =
  process.env.NODE_ENV === "development" ? dynamic(() => import("@/components/dev/DemoDataSection").then((m) => m.DemoDataSection), { ssr: false }) : null;

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

const row = "flex min-h-14 w-full items-center gap-3 px-4 text-left text-base";

export default function MorePage() {
  const t = useTranslations();
  const { locale, setLocale, ready, banglaDigits, setBanglaDigits } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const state = useEntries(ready ? t("entries.cashWallet") : null);
  const saveError = () => notify.error(t("common.saveError"));
  const showDay = (d: number) => (banglaDigits ? toBanglaDigits(String(d)) : String(d));
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
      <AccountSection row={row} />
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
          <button type="button" role="switch" aria-checked={locale === "bn"} className={row} onClick={changeLanguage}>
            <Languages className="size-5" aria-hidden />
            <span className="flex-1">{t("settings.language")}</span>
            <span className="text-muted-foreground">{locale === "bn" ? t("settings.bangla") : t("settings.english")}</span>
            <SwitchKnob on={locale === "bn"} />
          </button>
        </li>
        <li>
          <button type="button" role="switch" aria-checked={banglaDigits} className={row} onClick={changeDigits}>
            <Hash className="size-5" aria-hidden />
            <span className="flex-1">{t("settings.digits")}</span>
            <span className="text-muted-foreground">{banglaDigits ? t("settings.digitsBangla") : t("settings.digitsEnglish")}</span>
            <SwitchKnob on={banglaDigits} />
          </button>
        </li>
        <li>
          {/* resolvedTheme is unknown in the static HTML; wait for mount */}
          <button type="button" role="switch" aria-checked={ready && resolvedTheme === "dark"} className={row} onClick={() => changeTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <SunMoon className="size-5" aria-hidden />
            <span className="flex-1">{t("settings.darkMode")}</span>
            <SwitchKnob on={ready && resolvedTheme === "dark"} />
          </button>
        </li>
        <li>
          <div className={row}>
            <CalendarDays className="size-5" aria-hidden />
            <span className="flex-1">{t("settings.monthStart")}</span>
            <Select value={String(state.status === "ready" ? state.startDay : 1)} disabled={state.status !== "ready"} onValueChange={(d) => d && changeStartDay(Number(d))}>
              <SelectTrigger aria-label={t("settings.monthStart")} className="min-h-11 w-20 px-3 text-base tabular-nums">
                {showDay(state.status === "ready" ? state.startDay : 1)}
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="max-h-[min(var(--available-height),20rem)]">
                {DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)} className="min-h-11 text-base tabular-nums">{showDay(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </li>
        <InstallRow className={row} />
        <QuickAddHelp className={row} />
      </ul>
      {DemoDataSection && <DemoDataSection row={row} />}
    </main>
  );
}
