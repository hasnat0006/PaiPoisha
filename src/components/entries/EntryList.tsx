// Entries newest first, grouped by day (optionally with a daily total). Tap a row to edit it.
"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { Transaction } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import { useLocale, useMoney } from "@/i18n/provider";
import { addDays, categoryName, dhakaDay, groupByDay } from "@/lib/entries";
import { netOf, totalsCtx } from "@/lib/totals";
import { CategoryIcon } from "./CategoryIcon";

const AMOUNT_CLASS = {
  expense: "text-red-600 dark:text-red-400",
  income: "text-green-600 dark:text-green-400",
  transfer: "text-muted-foreground",
} as const;

interface Props {
  entries: Transaction[]; // the rows to show, newest first
  data: EntriesData;
  onOpen: (t: Transaction) => void;
  /** Show each day's net total, calculated from these entries (all filtered rows, not just the shown page). */
  dayTotalsFrom?: Transaction[];
}

export function EntryList({ entries, data, onOpen, dayTotalsFrom }: Props) {
  const t = useTranslations("entries");
  const format = useFormatter();
  const { locale } = useLocale();
  const { formatMoney } = useMoney();
  const today = dhakaDay(new Date());
  const ctx = totalsCtx(data.categories);
  const dayTotals = new Map(dayTotalsFrom ? groupByDay(dayTotalsFrom).map(([d, rows]) => [d, netOf(rows, ctx)]) : []);

  const dayLabel = (day: string) =>
    day === today
      ? t("today")
      : day === addDays(today, -1)
        ? t("yesterday")
        : format.dateTime(new Date(`${day}T12:00:00+06:00`), {
            day: "numeric",
            month: locale === "bn" ? "long" : "short",
            year: "numeric",
          });

  return (
    <div className="flex flex-col gap-4">
      {groupByDay(entries).map(([day, rows]) => (
        <section key={day}>
          <h2 className="mb-1 flex justify-between text-sm font-medium text-muted-foreground">
            <span>{dayLabel(day)}</span>
            {dayTotals.has(day) && <span className="whitespace-nowrap tabular-nums">{formatMoney(dayTotals.get(day)!, { signed: true })}</span>}
          </h2>
          <ul className="divide-y rounded-xl border">
            {rows.map((tx) => (
              <li key={tx.id}>
                <EntryRow tx={tx} data={data} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EntryRow({ tx, data, onOpen }: { tx: Transaction; data: EntriesData; onOpen: (t: Transaction) => void }) {
  const t = useTranslations("entries");
  const { locale } = useLocale();
  const { formatMoney } = useMoney();
  const wallet = (id: string | null) => data.wallets.find((w) => w.id === id)?.name ?? "";
  const cat = data.categories.find((c) => c.id === tx.category_id);
  const isTransfer = tx.type === "transfer";
  const title = isTransfer ? t("transfer") : cat ? categoryName(cat, locale) : "";
  const where = isTransfer ? `${wallet(tx.wallet_id)} → ${wallet(tx.to_wallet_id)}` : wallet(tx.wallet_id);
  const sign = tx.type === "expense" ? -tx.amount_paisa : tx.amount_paisa;

  return (
    <button type="button" onClick={() => onOpen(tx)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left">
      <CategoryIcon name={isTransfer ? "arrow-left-right" : (cat?.icon ?? "")} color={cat?.color} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base">{title}</span>
        <span className="block truncate text-sm text-muted-foreground">{tx.note ? `${tx.note} · ${where}` : where}</span>
      </span>
      <span className="text-right">
        <span className={`block whitespace-nowrap text-base font-medium tabular-nums ${AMOUNT_CLASS[tx.type]}`}>
          {isTransfer ? formatMoney(tx.amount_paisa) : formatMoney(sign, { signed: true })}
        </span>
        {tx.fee_paisa > 0 && (
          <span className="block whitespace-nowrap text-xs text-muted-foreground tabular-nums">
            {t("feeLine", { amount: formatMoney(tx.fee_paisa) })}
          </span>
        )}
      </span>
    </button>
  );
}
