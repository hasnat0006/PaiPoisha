"use client";

// Admin dashboard (user, 2026-11-16): totals only, never anyone's entries, amounts, names or emails.
// Number cards, one daily chart, then the feature suggestions. Built for tablets; stretches to wide screens.
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DailyChart, SERIES, type Mode, type Series } from "@/components/admin/DailyChart";
import { ErrorList } from "@/components/admin/ErrorList";
import { SuggestionList } from "@/components/admin/SuggestionList";
import { notify } from "@/components/common/notify";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadError, LoadingRows } from "@/components/common/ScreenState";
import { useAdmin } from "@/features/admin/useAdmin";
import { useLocale } from "@/i18n/provider";
import { toBanglaDigits } from "@/lib/money";

const RANGES = [7, 30, 90];
const chip = (on: boolean) => `min-h-11 rounded-md border px-3 text-sm ${on ? "border-foreground bg-foreground text-background" : "text-muted-foreground"}`;

// Free Supabase plan: the database turns read-only at 500 MB and sync stops; the tile turns red at 70%.
const DB_LIMIT_MB = 500;
const MB = 1024 * 1024;

export default function AdminPage() {
  const t = useTranslations("admin");
  const { banglaDigits } = useLocale();
  const [days, setDays] = useState(30);
  const [series, setSeries] = useState<Series>("active");
  const [mode, setMode] = useState<Mode>("daily");
  const { state, retry, setStatus } = useAdmin(days);
  const num = (n: number) => {
    const s = n.toLocaleString("en-IN");
    return banglaDigits ? toBanglaDigits(s) : s;
  };
  const pct = (part: number, whole: number) => num(whole ? Math.round((part / whole) * 100) : 0);

  const body = () => {
    if (state.status === "error") return <LoadError onRetry={retry} />;
    if (state.status !== "ready") return null;
    const { stats, suggestions, errors } = state;
    const sum = (k: Series) => stats.daily.reduce((a, d) => a + d[k], 0);
    const dbMb = Math.round(stats.db_bytes / MB);
    const dbPct = Math.round((stats.db_bytes / (DB_LIMIT_MB * MB)) * 100);
    const cards: [string, string, string?, boolean?][] = [
      [t("users"), num(stats.users), t("newInRange", { count: num(stats.new_users) })],
      [t("activeToday"), num(stats.active_today)],
      [t("active7"), num(stats.active_7)],
      [t("active30"), num(stats.active_30)],
      [t("signIns"), num(sum("sign_ins")), t("inRange")],
      [t("entries"), num(stats.entries), t("newInRange", { count: num(sum("entries")) })],
      [t("multiWallet"), num(stats.multi_wallet_users), t("ofUsers", { pct: pct(stats.multi_wallet_users, stats.users) })],
      [t("budgetUsers"), num(stats.budget_users), t("ofUsers", { pct: pct(stats.budget_users, stats.users) })],
      [t("database"), t("dbSize", { mb: num(dbMb) }), dbPct >= 70 ? t("dbWarn", { pct: num(dbPct) }) : t("dbOf", { pct: num(dbPct), limit: num(DB_LIMIT_MB) }), dbPct >= 70],
    ];
    return (
      <>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map(([label, value, note, warn]) => (
            <div key={label} className={`rounded-md border p-3 md:p-4 ${warn ? "border-destructive text-destructive" : ""}`}>
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl">{value}</div>
              {note && <div className={`mt-1 text-xs ${warn ? "" : "text-muted-foreground"}`}>{note}</div>}
            </div>
          ))}
        </section>

        <section className="rounded-md border p-3 md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("chartPick")}>
              {SERIES.map((s) => (
                <button key={s} type="button" aria-pressed={series === s} className={chip(series === s)} onClick={() => setSeries(s)}>
                  {t(`series.${s}`)}
                </button>
              ))}
            </div>
            {/* Daily actives can't be added up (the same person counts every day), so they have no running total. */}
            {series !== "active" && (
              <div className="flex gap-1" role="group" aria-label={t("mode")}>
                {(["daily", "total"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} className={chip(mode === m)} onClick={() => setMode(m)}>
                    {t(`modes.${m}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DailyChart stats={stats} series={series} mode={mode} num={num} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">
            {t("suggestions")} {stats.new_suggestions > 0 && <span className="text-sm font-normal text-muted-foreground">· {t("newCount", { count: num(stats.new_suggestions) })}</span>}
          </h2>
          <SuggestionList items={suggestions} num={num} onStatus={(id, s) => setStatus(id, s).catch(() => notify.error(t("statusError")))} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("errorsTitle")}</h2>
          <ErrorList items={errors} num={num} />
        </section>

        <p className="text-xs text-muted-foreground">{t("privacyNote")}</p>
      </>
    );
  };

  // Until the account is known to be an admin, show nothing of the dashboard: no title, no controls (user, 2026-11-16).
  if (state.status === "loading" || state.status === "denied") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center p-4">
        {state.status === "loading" ? <LoadingRows /> : <p className="text-center text-lg">{t("denied")}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:gap-6 md:p-6">
      <PageHeader title={t("title")}>
        <div className="flex gap-1" role="group" aria-label={t("range")}>
          {RANGES.map((d) => (
            <button key={d} type="button" aria-pressed={days === d} className={chip(days === d)} onClick={() => setDays(d)}>
              {t("days", { count: num(d) })}
            </button>
          ))}
        </div>
      </PageHeader>
      {body()}
    </main>
  );
}
