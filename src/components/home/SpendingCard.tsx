// "Spending by category" card: donut + a tappable legend that opens the category's entries.
"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { EntriesData } from "@/features/entries/useEntries";
import { useLocale, useMoney } from "@/i18n/provider";
import { categoryName } from "@/lib/entries";
import type { Period } from "@/lib/period";
import { spendingByCategory, topWithOthers, totalsCtx } from "@/lib/totals";
import type { Slice } from "./SpendingChart";

const SpendingChart = dynamic(() => import("./SpendingChart"), {
  ssr: false,
  loading: () => <div className="size-40 animate-pulse rounded-md bg-muted" />,
});

const OTHERS_COLOR = "#94a3b8";

export function SpendingCard({ data, inPeriod, period }: { data: EntriesData; inPeriod: EntriesData["entries"]; period: Period }) {
  const t = useTranslations("home");
  const { locale } = useLocale();
  const { formatMoney } = useMoney();
  const router = useRouter();
  const { top, others } = topWithOthers(spendingByCategory(inPeriod, totalsCtx(data.categories)));
  if (top.length === 0) return null;

  const slices: Slice[] = top.map(({ categoryId, spent }) => {
    const c = data.categories.find((x) => x.id === categoryId);
    return { id: categoryId, name: c ? categoryName(c, locale) : "", spent, fill: c?.color ?? OTHERS_COLOR };
  });
  if (others > 0) slices.push({ id: null, name: t("others"), spent: others, fill: OTHERS_COLOR });

  const open = (s: Slice) =>
    router.push(`/transactions/?period=${period.key}${s.id ? `&category=${s.id}` : "&type=expense"}`);

  return (
    <section className="rounded-xl border p-4">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{t("byCategory")}</h2>
      <div className="flex items-center gap-4">
        <SpendingChart slices={slices} onSelect={open} />
        <ul className="min-w-0 flex-1">
          {slices.map((s) => (
            <li key={s.id ?? "others"}>
              <button type="button" onClick={() => open(s)} className="flex min-h-11 w-full items-center gap-2 text-left text-sm">
                <span className="size-3 shrink-0 rounded-md" style={{ background: s.fill }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="whitespace-nowrap tabular-nums">{formatMoney(s.spent)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
