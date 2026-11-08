"use client";

// Budgets tab (spec §5): bars for Overall and each budgeted category, for the chosen period.
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BudgetBar } from "@/components/budgets/BudgetBar";
import { PeriodSwitcher } from "@/components/common/PeriodSwitcher";
import { LoadError, LoadingRows } from "@/components/common/ScreenState";
import { Button } from "@/components/ui/button";
import type { Budget } from "@/db/types";
import { budgetRows } from "@/features/budgets/budgetRows";
import { useEntries } from "@/features/entries/useEntries";
import { useLocale } from "@/i18n/provider";
import { getPeriod, periodFromKey } from "@/lib/period";

// The sheet brings the drawer library; load it only when first opened.
const BudgetSheet = dynamic(() => import("@/components/budgets/BudgetSheet").then((m) => m.BudgetSheet), { ssr: false });

export default function BudgetsPage() {
  const t = useTranslations();
  const { ready } = useLocale();
  const state = useEntries(ready ? t("entries.cashWallet") : null);
  const [periodKey, setPeriodKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const edit = (b: Budget | null) => {
    setEditing(b);
    setUsed(true);
    setOpen(true);
  };

  if (state.status !== "ready") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <h1 className="text-xl font-semibold">{t("budgets.title")}</h1>
        {state.status === "loading" ? <LoadingRows /> : <LoadError onRetry={state.retry} />}
      </main>
    );
  }

  const period = periodKey ? periodFromKey(periodKey, state.startDay) : getPeriod(new Date(), state.startDay);
  const rows = budgetRows(state, period);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">{t("budgets.title")}</h1>
      <PeriodSwitcher period={period} startDay={state.startDay} onChange={(p) => setPeriodKey(p.key)} />
      {rows.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">{t("budgets.empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border px-3">
          {rows.map((r) => (
            <li key={r.budget.id}>
              <BudgetBar row={r} data={state} onClick={() => edit(r.budget)} />
            </li>
          ))}
        </ul>
      )}
      <Button className="min-h-11 text-base" onClick={() => edit(null)}>
        {t("budgets.add")}
      </Button>
      {used && <BudgetSheet
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        month={period.key}
        data={state}
        taken={rows.map((r) => r.budget.category_id)}
      />}
    </main>
  );
}
