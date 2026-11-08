// One budget: name, spent / limit, a coloured bar and "৳1,200 left" / "৳300 left · 9 days to go" / "৳450 over".
"use client";

import { useTranslations } from "next-intl";
import { CategoryIcon } from "@/components/entries/CategoryIcon";
import { Progress } from "@/components/ui/progress";
import type { EntriesData } from "@/features/entries/useEntries";
import type { BudgetRow } from "@/features/budgets/budgetRows";
import { useLocale, useMoney } from "@/i18n/provider";
import { categoryName } from "@/lib/entries";

const BAR = {
  ok: "[&_[data-slot=progress-indicator]]:bg-green-600 dark:[&_[data-slot=progress-indicator]]:bg-green-500",
  near: "[&_[data-slot=progress-indicator]]:bg-amber-500",
  over: "[&_[data-slot=progress-indicator]]:bg-red-600 dark:[&_[data-slot=progress-indicator]]:bg-red-500",
} as const;
const TEXT = { ok: "text-muted-foreground", near: "text-amber-700 dark:text-amber-400", over: "text-red-600 dark:text-red-400" } as const;

/** The status line, also used in the toast after saving an entry. */
export function useBudgetLine() {
  const t = useTranslations("budgets");
  const { formatMoney } = useMoney();
  return ({ progress: p }: BudgetRow) => {
    if (p.status === "over") return t("over", { amount: formatMoney(-p.left) });
    if (p.status === "near" && p.daysLeft !== null) return t("leftDays", { amount: formatMoney(p.left), days: p.daysLeft });
    return t("left", { amount: formatMoney(p.left) });
  };
}

export function BudgetBar({ row, data, onClick }: { row: BudgetRow; data: EntriesData; onClick?: () => void }) {
  const t = useTranslations("budgets");
  const { locale } = useLocale();
  const { formatMoney } = useMoney();
  const line = useBudgetLine();
  const cat = data.categories.find((c) => c.id === row.budget.category_id);
  const name = cat ? categoryName(cat, locale) : t("overall");
  const { status, ratio } = row.progress;

  return (
    <button type="button" onClick={onClick} disabled={!onClick} className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-100">
      <CategoryIcon name={cat?.icon ?? "piggy-bank"} color={cat?.color} />
      <span className="min-w-0 flex-1">
        <span className="flex justify-between gap-2 text-base">
          <span className="truncate">{name}</span>
          <span className="whitespace-nowrap text-sm tabular-nums">
            {formatMoney(row.spent)} / {formatMoney(row.budget.limit_paisa)}
          </span>
        </span>
        <Progress value={Math.min(100, Math.round(ratio * 100))} aria-label={name} className={`my-1.5 ${BAR[status]}`} />
        <span className={`block text-sm ${TEXT[status]}`}>{line(row)}</span>
      </span>
    </button>
  );
}
