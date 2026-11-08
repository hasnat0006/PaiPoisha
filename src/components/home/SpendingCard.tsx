// "Spending by category" card, laid out like iPhone's storage screen (user, 2026-11-09): one bar split by category,
// then a compact two-column grid (user, 2026-11-09) with each category's icon, amount and share.
// Top 5 plus "Others"; tapping one opens its entries.
"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CategoryIcon } from "@/components/entries/CategoryIcon";
import type { EntriesData } from "@/features/entries/useEntries";
import { useLocale, useMoney } from "@/i18n/provider";
import { categoryName } from "@/lib/entries";
import { toBanglaDigits } from "@/lib/money";
import type { Period } from "@/lib/period";
import { sharePercents, spendingByCategory, topWithOthers, totalsCtx } from "@/lib/totals";

const OTHERS_COLOR = "#94a3b8";

type Row = { id: string | null; name: string; icon: string; color: string; spent: number }; // id null = Others

export function SpendingCard({ data, inPeriod, period }: { data: EntriesData; inPeriod: EntriesData["entries"]; period: Period }) {
  const t = useTranslations("home");
  const { locale, banglaDigits } = useLocale();
  const { formatMoney } = useMoney();
  const router = useRouter();
  const { top, others } = topWithOthers(spendingByCategory(inPeriod, totalsCtx(data.categories)));
  if (top.length === 0) return null;

  const rows: Row[] = top.map(({ categoryId, spent }) => {
    const c = data.categories.find((x) => x.id === categoryId);
    return { id: categoryId, name: c ? categoryName(c, locale) : "", icon: c?.icon ?? "circle-ellipsis", color: c?.color ?? OTHERS_COLOR, spent };
  });
  if (others > 0) rows.push({ id: null, name: t("others"), icon: "circle-ellipsis", color: OTHERS_COLOR, spent: others });
  const shares = sharePercents(rows.map((r) => r.spent));
  const percent = (p: number, spent: number) => {
    const s = p === 0 && spent > 0 ? "<1%" : `${p}%`;
    return banglaDigits ? toBanglaDigits(s) : s;
  };

  const open = (r: Row) => router.push(`/transactions/?period=${period.key}${r.id ? `&category=${r.id}` : "&type=expense"}`);

  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-sm font-medium text-muted-foreground">{t("byCategory")}</h2>
      {/* The list below says the same in words, so the bar is decoration for screen readers. */}
      <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-md" aria-hidden>
        {rows.map((r) => (
          <span key={r.id ?? "others"} className="h-full min-w-1 basis-0" style={{ flexGrow: r.spent, background: r.color }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map((r, i) => (
          <li key={r.id ?? "others"} className="min-w-0">
            <button type="button" onClick={() => open(r)} className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md py-1 text-left">
              <CategoryIcon name={r.icon} color={r.color} small />
              {/* Name above; the amount with its share right beside it (user, 2026-11-09: the share far from the amount
                  read badly). The share is smaller so a lakh amount in Bangla digits still fits half a 360 px phone. */}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-muted-foreground">{r.name}</span>
                <span className="flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap tabular-nums">
                  <span className="text-sm font-semibold">{formatMoney(r.spent)}</span>
                  <span className="text-xs text-muted-foreground">{percent(shares[i], r.spent)}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
