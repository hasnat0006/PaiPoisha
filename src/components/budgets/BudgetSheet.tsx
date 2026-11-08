// Set, change or remove a budget for the shown month: Overall or one expense category (spec §5).
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/components/common/notify";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type { Budget } from "@/db/types";
import { removeBudget, setBudget } from "@/features/budgets/budgetActions";
import type { EntriesData } from "@/features/entries/useEntries";
import { useLocale } from "@/i18n/provider";
import { categoryName, paisaToInput } from "@/lib/entries";
import { isValidAmount, parseAmount } from "@/lib/money";

const OVERALL = "overall";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Budget | null;
  month: string;
  data: EntriesData;
  taken: (string | null)[]; // category ids that already have a budget this month (null = overall)
}

export function BudgetSheet(props: Props) {
  const t = useTranslations("budgets");
  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg">{props.editing ? t("editTitle") : t("addTitle")}</DrawerTitle>
        </DrawerHeader>
        <BudgetForm key={props.editing?.id ?? "new"} {...props} />
      </DrawerContent>
    </Drawer>
  );
}

function BudgetForm({ editing, month, data, taken, onOpenChange }: Props) {
  const t = useTranslations("budgets");
  const tc = useTranslations("common");
  const { locale } = useLocale();
  const choices = [
    ...(taken.includes(null) ? [] : [{ id: OVERALL, label: t("overall") }]),
    ...data.categories
      .filter((c) => c.type === "expense" && !c.hidden && c.key !== "adjustment" && !taken.includes(c.id))
      .map((c) => ({ id: c.id, label: categoryName(c, locale) })),
  ];
  const [target, setTarget] = useState(editing ? (editing.category_id ?? OVERALL) : (choices[0]?.id ?? OVERALL));
  const [amount, setAmount] = useState(editing ? paisaToInput(editing.limit_paisa) : "");
  const [bad, setBad] = useState(false);
  const categoryId = target === OVERALL ? null : target;

  const run = async (action: () => Promise<void>, message: string) => {
    try {
      await action();
      notify.success(message);
      onOpenChange(false);
    } catch {
      notify.error(tc("saveError"));
    }
  };
  const save = () => {
    const limit = parseAmount(amount);
    if (!isValidAmount(limit)) return (setBad(true), notify.invalid(t("errLimit")));
    void run(() => setBudget(month, categoryId, limit), t("saved"));
  };

  return (
    <div className="flex flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {!editing && (
        <select
          className="min-h-11 rounded-lg border bg-background px-2 text-base"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          aria-label={t("category")}
        >
          {choices.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      )}
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        {t("limit")}
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setBad(false);
          }}
          aria-invalid={bad}
          className="tabular-nums"
        />
      </label>
      {bad && <p role="alert" className="text-sm text-destructive">{t("errLimit")}</p>}
      <Button className="min-h-11 text-base" onClick={save}>
        {tc("save")}
      </Button>
      {editing && (
        <Button variant="destructive" className="min-h-11" onClick={() => run(() => removeBudget(month, editing.category_id), t("removed"))}>
          {t("remove")}
        </Button>
      )}
    </div>
  );
}
