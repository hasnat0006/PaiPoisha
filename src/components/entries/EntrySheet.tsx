// The add/edit bottom sheet (spec §3): type tabs, amount on our own pad, fields, Save / Save & add another.
"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Transaction, TransactionType } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import { budgetAlert } from "@/features/budgets/budgetRows";
import { useEntryForm } from "@/features/entries/useEntryForm";
import { useLocale, useMoney } from "@/i18n/provider";
import { sortByUsage, type EntryDraft, type EntryError } from "@/lib/entries";
import { parseAmount, toBanglaDigits } from "@/lib/money";
import { useBudgetLine } from "@/components/budgets/BudgetBar";
import { EntryFields } from "./EntryFields";
import { NumberPad } from "./NumberPad";

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const ERROR_KEY = { amount: "errAmount", fee: "errFee", category: "errCategory", wallets: "errWallets", date: "errDate" } as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Transaction | null;
  data: EntriesData;
  prefill?: Partial<EntryDraft>; // from a quick-add link
}

export function EntrySheet({ open, onOpenChange, editing, data, prefill }: Props) {
  const t = useTranslations("entries");
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="flex-row items-center justify-between text-left">
          <DrawerTitle className="text-lg">{editing ? t("editTitle") : t("addTitle")}</DrawerTitle>
        </DrawerHeader>
        <EntryForm key={editing?.id ?? "new"} data={data} editing={editing} prefill={prefill} close={() => onOpenChange(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function EntryForm({ data, editing, prefill, close }: Pick<Props, "data" | "editing" | "prefill"> & { close: () => void }) {
  const t = useTranslations("entries");
  const tc = useTranslations("common");
  const { banglaDigits } = useLocale();
  const { formatMoney } = useMoney();
  const form = useEntryForm(data, editing, prefill);
  const budgetLine = useBudgetLine();
  const { draft, set, setType, padField, setPadField, errors } = form;
  const isTransfer = draft.type === "transfer";
  const noTransfer = isTransfer && data.activeWallets.length < 2;
  const categories = sortByUsage(
    data.categories.filter((c) => c.type === draft.type && !c.hidden && c.key !== "adjustment"),
    data.entries,
  );

  const save = async (again: boolean) => {
    let row;
    try {
      row = await form.save(again);
    } catch {
      return void toast.error(t("saveError")); // keep the sheet open so nothing typed is lost
    }
    if (!row) return;
    const alert = budgetAlert(data, row, editing?.id);
    toast.success(t("saved"), { duration: alert ? 4000 : 1500, description: alert ? budgetLine(alert) : undefined });
    if (!again) close();
  };
  const remove = async () => {
    const undo = await form.remove();
    close();
    toast(t("deleted"), { duration: 5000, action: { label: tc("undo"), onClick: () => void undo() } });
  };

  const digits = (s: string) => (banglaDigits ? toBanglaDigits(s) : s).replace(/-/g, "−");
  const sum = /[+-]/.test(draft.amount) ? parseAmount(draft.amount) : null;
  const firstError = errors[0] as EntryError | undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Tabs value={draft.type} onValueChange={(v) => setType(v as TransactionType)}>
        <TabsList className="w-full group-data-horizontal/tabs:h-11">
          {TYPES.map((type) => (
            <TabsTrigger key={type} value={type} className="text-base">
              {t(type)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <button
        type="button"
        onClick={() => setPadField("amount")}
        aria-label={t("amount")}
        className={`rounded-lg border-2 px-3 py-2 text-right ${padField === "amount" ? "border-primary" : "border-transparent"}`}
      >
        <span className={`block whitespace-nowrap text-3xl font-semibold tabular-nums ${draft.amount ? "" : "text-muted-foreground"}`}>
          ৳{draft.amount ? digits(draft.amount) : digits("0")}
        </span>
        {sum !== null && <span className="block text-sm text-muted-foreground tabular-nums">= {formatMoney(sum)}</span>}
      </button>
      {isTransfer && (
        <button
          type="button"
          onClick={() => setPadField("fee")}
          className={`flex min-h-11 items-center justify-between rounded-lg border-2 px-3 text-sm ${padField === "fee" ? "border-primary" : "border-transparent bg-muted"}`}
        >
          <span>{t("fee")}</span>
          <span className="whitespace-nowrap tabular-nums">৳{digits(draft.fee || "0")}</span>
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {noTransfer ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("needTwoWallets")}</p>
        ) : (
          <EntryFields data={data} form={form} categories={categories} />
        )}
      </div>

      <NumberPad value={draft[padField]} onChange={(v) => set({ [padField]: v })} />
      {firstError && (
        <p role="alert" className="text-center text-sm text-destructive">
          {t(ERROR_KEY[firstError])}
        </p>
      )}
      <div className="flex gap-2">
        {editing ? (
          <Button variant="destructive" className="min-h-11 min-w-11" onClick={remove} aria-label={tc("delete")}>
            <Trash2 className="size-5" />
          </Button>
        ) : (
          <Button variant="outline" className="min-h-11 flex-1 text-base" disabled={noTransfer} onClick={() => save(true)}>
            {t("saveAndAdd")}
          </Button>
        )}
        <Button className="min-h-11 flex-1 text-base" disabled={noTransfer} onClick={() => save(false)}>
          {tc("save")}
        </Button>
      </div>
    </div>
  );
}
