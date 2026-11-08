"use client";

// Transactions (spec §7): every entry, filtered and searched, grouped by day, 50 at a time, with a total.
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { LoadError, LoadingRows } from "@/components/common/ScreenState";
import { EntryList } from "@/components/entries/EntryList";
import { useOpenEntry } from "@/components/shell/AppShell";
import { FilterBar } from "@/components/transactions/FilterBar";
import { Button } from "@/components/ui/button";
import type { TransactionType } from "@/db/types";
import { useEntries } from "@/features/entries/useEntries";
import { useLocale, useMoney } from "@/i18n/provider";
import { filterEntries, NO_FILTERS, type Filters } from "@/lib/filter";
import { DEFAULT_START_DAY, periodFromKey } from "@/lib/period";
import { netOf, totalsCtx } from "@/lib/totals";

const PAGE = 50;
const TYPES = ["expense", "income", "transfer"];

/** Filters from a link like /transactions/?period=2026-11&category=… (from the Home chart). */
function fromParams(p: URLSearchParams): Filters {
  const period = p.get("period");
  const type = p.get("type");
  return {
    ...NO_FILTERS,
    period: period && /^\d{4}-\d{2}$/.test(period) ? periodFromKey(period, DEFAULT_START_DAY) : null,
    type: type && TYPES.includes(type) ? (type as TransactionType) : null,
    categoryId: p.get("category"),
  };
}

function TransactionsScreen() {
  const t = useTranslations();
  const { ready } = useLocale();
  const { formatMoney } = useMoney();
  const openEntry = useOpenEntry();
  const state = useEntries(ready ? t("entries.cashWallet") : null);
  const params = useSearchParams();
  const [f, setF] = useState<Filters>(() => fromParams(params));
  const [shown, setShown] = useState(PAGE);
  const more = useRef<HTMLButtonElement>(null);
  const set = (c: Partial<Filters>) => {
    setF((x) => ({ ...x, ...c }));
    setShown(PAGE);
  };

  const data = state.status === "ready" ? state : null;
  // Rebuild the period from its key so a changed month start day applies straight away.
  const startDay = data?.startDay ?? DEFAULT_START_DAY;
  const active = useMemo(() => ({ ...f, period: f.period && periodFromKey(f.period.key, startDay) }), [f, startDay]);
  const rows = useMemo(
    () => (data ? filterEntries(data.entries, active, new Map(data.categories.map((c) => [c.id, c]))) : []),
    [data, active],
  );

  // Load the next page when the "more" button scrolls into view.
  useEffect(() => {
    const el = more.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown((n) => n + PAGE));
    io.observe(el);
    return () => io.disconnect();
  }, [rows.length, shown]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">{t("transactions.title")}</h1>
      {state.status === "loading" && <LoadingRows />}
      {state.status === "error" && <LoadError onRetry={state.retry} />}
      {data && (
        <>
          <FilterBar f={active} set={set} data={data} />
          {rows.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">{t("transactions.none")}</p>
          ) : (
            <EntryList entries={rows.slice(0, shown)} data={data} onOpen={openEntry} dayTotalsFrom={rows} />
          )}
          {shown < rows.length && (
            <Button ref={more} variant="outline" className="min-h-11" onClick={() => setShown((n) => n + PAGE)}>
              {t("transactions.loadMore")}
            </Button>
          )}
          <footer className="sticky bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.5rem)] -mx-4 flex justify-between glass border-t px-4 py-2 text-sm">
            <span>{t("transactions.count", { count: rows.length })}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums">
              {formatMoney(netOf(rows, totalsCtx(data.categories)), { signed: true })}
            </span>
          </footer>
        </>
      )}
    </main>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-md p-4"><LoadingRows /></main>}>
      <TransactionsScreen />
    </Suspense>
  );
}
