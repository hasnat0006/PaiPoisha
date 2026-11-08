// Search + combinable filters (period, type, wallet, category), with removable chips (spec §7).
"use client";

import { X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { PeriodSwitcher } from "@/components/common/PeriodSwitcher";
import { Input } from "@/components/ui/input";
import type { TransactionType } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import { useLocale } from "@/i18n/provider";
import { categoryName } from "@/lib/entries";
import type { Filters } from "@/lib/filter";
import { getPeriod } from "@/lib/period";

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const selectCls = "min-h-11 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm";

export function FilterBar({ f, set, data }: { f: Filters; set: (c: Partial<Filters>) => void; data: EntriesData }) {
  const t = useTranslations("transactions");
  const te = useTranslations("entries");
  const format = useFormatter();
  const { locale } = useLocale();
  const catName = (id: string) => {
    const c = data.categories.find((x) => x.id === id);
    return c ? categoryName(c, locale) : "";
  };

  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (f.period)
    chips.push({ label: format.dateTime(new Date(`${f.period.key}-15T12:00:00+06:00`), { month: "long", year: "numeric" }), clear: { period: null } });
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
          value={f.period ? "month" : ""}
          onChange={(e) => set({ period: e.target.value ? getPeriod(new Date(), data.startDay) : null })}
        >
          <option value="">{t("allTime")}</option>
          <option value="month">{t("byMonth")}</option>
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
