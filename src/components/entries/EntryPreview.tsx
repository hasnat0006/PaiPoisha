// "Check before saving": a read-only summary of the entry about to be saved, with Edit (back to the form) and Confirm.
"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { EntriesData } from "@/features/entries/useEntries";
import { useLocale, useMoney } from "@/i18n/provider";
import { categoryName, type EntryFields } from "@/lib/entries";

const AMOUNT_CLASS = {
  expense: "text-red-600 dark:text-red-400",
  income: "text-green-600 dark:text-green-400",
  transfer: "",
} as const;

interface Props {
  row: EntryFields;
  data: EntriesData;
  busy: boolean;
  onEdit: () => void;
  onConfirm: () => void;
}

export function EntryPreview({ row, data, busy, onEdit, onConfirm }: Props) {
  const t = useTranslations("entries");
  const tc = useTranslations("common");
  const format = useFormatter();
  const { locale } = useLocale();
  const { formatMoney } = useMoney();
  const wallet = (id: string | null) => data.wallets.find((w) => w.id === id)?.name ?? "";
  const category = data.categories.find((c) => c.id === row.category_id);
  const isTransfer = row.type === "transfer";

  const rows: [string, string][] = isTransfer
    ? [
        [t("from"), wallet(row.wallet_id)],
        [t("to"), wallet(row.to_wallet_id)],
        ...(row.fee_paisa ? [[t("feeLabel"), formatMoney(row.fee_paisa)] as [string, string]] : []),
      ]
    : [[t("wallet"), wallet(row.wallet_id)]];
  rows.push([t("date"), format.dateTime(new Date(row.occurred_at), { day: "numeric", month: locale === "bn" ? "long" : "short", year: "numeric" })]);
  if (row.note) rows.push([t("noteLabel"), row.note]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="text-center text-base font-medium">{t("checkTitle")}</h2>
      <div className="text-center">
        <div className={`whitespace-nowrap text-3xl font-semibold tabular-nums ${AMOUNT_CLASS[row.type]}`}>{formatMoney(row.amount_paisa)}</div>
        <div className="text-sm text-muted-foreground">
          {t(row.type)}
          {!isTransfer && category && ` · ${categoryName(category, locale)}`}
        </div>
      </div>
      <dl className="min-h-0 flex-1 divide-y overflow-y-auto border-y">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex gap-2">
        <Button variant="outline" className="min-h-11 flex-1 text-base" onClick={onEdit} disabled={busy}>
          {tc("edit")}
        </Button>
        <Button className="min-h-11 flex-1 text-base" onClick={onConfirm} disabled={busy}>
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}
