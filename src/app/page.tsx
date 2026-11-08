"use client";

// Home dashboard (spec §6): period, Income · Spent · Net, wallet balances, spending by category,
// budgets near or over the limit, last 5 entries.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LoadError, LoadingRows } from "@/components/common/ScreenState";
import { PeriodSwitcher } from "@/components/common/PeriodSwitcher";
import { CategoryIcon } from "@/components/entries/CategoryIcon";
import { EntryList } from "@/components/entries/EntryList";
import { BudgetBar } from "@/components/budgets/BudgetBar";
import { SpendingCard } from "@/components/home/SpendingCard";
import { SyncIcon } from "@/components/sync/SyncIcon";
import { useOpenEntry } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { budgetRows } from "@/features/budgets/budgetRows";
import { useEntries } from "@/features/entries/useEntries";
import { useLocale, useMoney } from "@/i18n/provider";
import { totalBalance, walletBalances } from "@/lib/balances";
import { getPeriod, inPeriod, periodFromKey } from "@/lib/period";
import { periodTotals, totalsCtx } from "@/lib/totals";

const red = "text-red-600 dark:text-red-400";
const green = "text-green-600 dark:text-green-400";

export default function HomePage() {
  const t = useTranslations();
  const { ready, banglaDigits } = useLocale();
  const { formatMoney } = useMoney();
  const openEntry = useOpenEntry();
  const state = useEntries(ready ? t("entries.cashWallet") : null);
  const [periodKey, setPeriodKey] = useState<string | null>(null); // null = the current period

  if (state.status !== "ready") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <h1 className="text-2xl font-semibold">{t("app.name")}</h1>
        {state.status === "loading" ? <LoadingRows /> : <LoadError onRetry={state.retry} />}
      </main>
    );
  }

  if (state.entries.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-3 p-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("app.name")}</h1>
        <p className="text-muted-foreground">{t("home.empty")}</p>
        <Button className="min-h-11 px-6 text-base" onClick={() => openEntry(null)}>
          {t("home.addFirst")}
        </Button>
      </main>
    );
  }

  const period = periodKey ? periodFromKey(periodKey, state.startDay) : getPeriod(new Date(), state.startDay);
  const ctx = totalsCtx(state.categories);
  const periodEntries = state.entries.filter((e) => inPeriod(e.occurred_at, period));
  const { income, spent, net } = periodTotals(periodEntries, ctx);
  const balances = walletBalances(state.wallets, state.entries);
  const total = totalBalance(state.activeWallets, balances);
  const alerts = budgetRows(state, period).filter((r) => r.progress.status !== "ok");
  const values = [formatMoney(income), formatMoney(spent), formatMoney(net, { signed: true })];
  // Bigger numbers (user, 2026-11-09): as large as the narrowest card allows, up to 20 px, one size for all three so
  // they match. Sized from the longest value, so "+৳1,23,456" shrinks instead of overflowing. Measured width per
  // character, with a little spare: English digits 0.46 em, Bangla 0.56 em.
  const emPerChar = banglaDigits ? 0.6 : 0.5;
  const fontSize = `min(1.25rem, ${(100 / (Math.max(...values.map((v) => v.length)) * emPerChar)).toFixed(1)}cqw)`;
  const stat = (label: string, value: string, cls = "") => (
    <div className="@container rounded-xl border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 whitespace-nowrap font-semibold tabular-nums ${cls}`} style={{ fontSize }}>
        {value}
      </div>
    </div>
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <PeriodSwitcher period={period} startDay={state.startDay} onChange={(p) => setPeriodKey(p.key)} />
        </div>
        <SyncIcon />
      </div>
      <section className="grid grid-cols-3 gap-2 text-center">
        {stat(t("home.income"), values[0], green)}
        {stat(t("home.spent"), values[1], red)}
        {stat(t("home.net"), values[2], net < 0 ? red : green)}
      </section>

      <section>
        <Link href="/wallets/" className="block">
          <span className="text-sm text-muted-foreground">{t("home.totalBalance")}</span>
          <span className={`block whitespace-nowrap text-2xl font-semibold tabular-nums ${total < 0 ? red : ""}`}>{formatMoney(total)}</span>
        </Link>
        <ul className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {state.activeWallets.map((w) => {
            const b = balances.get(w.id) ?? 0;
            return (
              <li key={w.id} className="flex min-w-36 shrink-0 items-center gap-2 rounded-xl border p-2">
                <CategoryIcon name={w.icon} color={w.color} />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{w.name}</span>
                  <span className={`block whitespace-nowrap text-sm font-medium tabular-nums ${b < 0 ? red : ""}`}>{formatMoney(b)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <SpendingCard data={state} inPeriod={periodEntries} period={period} />

      {alerts.length > 0 && (
        <section className="rounded-xl border px-3 pt-2">
          <Link href="/budgets/" className="flex min-h-11 items-center text-sm font-medium text-muted-foreground">
            {t("budgets.nearTitle")}
          </Link>
          <ul className="divide-y">
            {alerts.map((r) => (
              <li key={r.budget.id}>
                <BudgetBar row={r} data={state} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">{t("home.recent")}</h2>
          <Link href="/transactions/" className="flex min-h-11 items-center text-sm text-primary">
            {t("common.seeAll")}
          </Link>
        </div>
        <EntryList entries={state.entries.slice(0, 5)} data={state} onOpen={openEntry} />
      </section>
    </main>
  );
}
