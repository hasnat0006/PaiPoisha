// Search + combinable filters (period or custom dates, type, wallet, category), with removable chips (spec §7).
"use client";

import { X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { PeriodSwitcher } from "@/components/common/PeriodSwitcher";
import { Input } from "@/components/ui/input";
import type { TransactionType } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import { useLocale } from "@/i18n/provider";
import { categoryName, dhakaDay } from "@/lib/entries";
import type { Filters } from "@/lib/filter";
import { getPeriod } from "@/lib/period";

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const selectCls = "min-h-11 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm";

export function FilterBar({ f, set, data }: { f: Filters; set: (c: Partial<Filters>) => void; data: EntriesData }) {
  const t = useTranslations("transactions");
  const te = useTranslations("entries");
  const format = useFormatter();
  const { locale } = useLocale();
  const today = dhakaDay(new Date());
  const catName = (id: string) => {
    const c = data.categories.find((x) => x.id === id);
    return c ? categoryName(c, locale) : "";
  };

  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (f.period)
    chips.push({ label: format.dateTime(new Date(`${f.period.key}-15T12:00:00+06:00`), { month: "long", year: "numeric" }), clear: { period: null } });
  if (f.range) {
    const day = (d: string) => format.dateTime(new Date(`${d}T12:00:00+06:00`), { day: "numeric", month: "short", year: "numeric" });
    chips.push({ label: `${day(f.range.from)} – ${day(f.range.to)}`, clear: { range: null } });
  }
  if (f.type) chips.push({ label: te(f.type), clear: { type: null } });
  if (f.walletId) chips.push({ label: data.wallets.find((w) => w.id === f.walletId)?.name ?? "", clear: { walletId: null } });
  if (f.categoryId) chips.push({ label: catName(f.categoryId), clear: { categoryId: null } });

  return (
    <div className="flex flex-col gap-2">
      <Input type="search" value={f.search} onChange={(e) => set({ search: e.target.value })} placeholder={t("search")} aria-label={t("search")} />
      <div className="flex gap-2">
        <select
          className={selectCls}
          aria-label={t("period")}
          value={f.period ? "month" : f.range ? "range" : ""}
          onChange={(e) => {
            const v = e.target.value;
            const month = getPeriod(new Date(), data.startDay);
            set({
              period: v === "month" ? month : null,
              // start with this period's first day through today
              range: v === "range" ? { from: dhakaDay(month.start), to: today } : null,
            });
          }}
        >
          <option value="">{t("allTime")}</option>
          <option value="month">{t("byMonth")}</option>
          <option value="range">{t("customRange")}</option>
        </select>
        <select className={selectCls} aria-label={t("type")} value={f.type ?? ""} onChange={(e) => set({ type: (e.target.value || null) as TransactionType | null })}>
          <option value="">{t("allTypes")}</option>
          {TYPES.map((x) => (
            <option key={x} value={x}>{te(x)}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <select className={selectCls} aria-label={t("wallet")} value={f.walletId ?? ""} onChange={(e) => set({ walletId: e.target.value || null })}>
          <option value="">{t("allWallets")}</option>
          {data.wallets.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select className={selectCls} aria-label={t("category")} value={f.categoryId ?? ""} onChange={(e) => set({ categoryId: e.target.value || null })}>
          <option value="">{t("allCategories")}</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>{categoryName(c, locale)}</option>
          ))}
        </select>
      </div>
      {f.range && (
        <div className="flex gap-2">
          {(["from", "to"] as const).map((k) => (
            <label key={k} className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted-foreground">
              {t(k)}
              <input
                type="date"
                lang={locale}
                value={f.range![k]}
                min={k === "to" ? f.range!.from : undefined}
                max={k === "from" ? f.range!.to : undefined}
                onChange={(e) => e.target.value && set({ range: { ...f.range!, [k]: e.target.value } })}
                className="min-h-11 min-w-0 rounded-lg border bg-background px-2 text-base text-foreground"
              />
            </label>
          ))}
        </div>
      )}
      {f.period && <PeriodSwitcher period={f.period} startDay={data.startDay} onChange={(period) => set({ period })} />}
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("activeFilters")}>
          {chips.map((c) => (
            <li key={c.label}>
              <button
                type="button"
                onClick={() => set(c.clear)}
                aria-label={t("removeFilter", { name: c.label })}
                className="flex min-h-11 items-center gap-1 rounded-md bg-primary/10 px-3 text-sm"
              >
                {c.label}
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
