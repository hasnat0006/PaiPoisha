// The middle of the add sheet, one labelled row each (user, 2026-11-08): category (or From/To for transfers)
// and wallet as dropdowns, then the date (Today or any picked day) and the note.
"use client";

import { CalendarDays } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { Category } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import type { useEntryForm } from "@/features/entries/useEntryForm";
import { useLocale } from "@/i18n/provider";
import { categoryName, dhakaDay, NOTE_MAX } from "@/lib/entries";
import { CategoryIcon } from "./CategoryIcon";
import { FIELD_LABEL, FieldSelect } from "./FieldSelect";

/** The dropdown trigger's look (ui/select), so the date row matches the rows above it. */
const CONTROL = "flex min-h-11 items-center rounded-lg border border-input text-base transition-colors dark:bg-input/30";

interface Props {
  data: EntriesData;
  form: ReturnType<typeof useEntryForm>;
  categories: Category[]; // for the current type, sorted by usage
}

export function EntryFields({ data, form, categories }: Props) {
  const t = useTranslations("entries");
  const format = useFormatter();
  const { locale } = useLocale();
  const { draft, set, errors } = form;
  const today = dhakaDay(new Date());
  // An archived wallet the entry already uses stays listed, so the box isn't blank when editing.
  const wallets = data.wallets.filter((w) => !w.archived || w.id === draft.walletId || w.id === draft.toWalletId).map((w) => ({ id: w.id, label: w.name, icon: <CategoryIcon name={w.icon} color={w.color} /> }));
  const isTransfer = draft.type === "transfer";
  const walletsInvalid = errors.includes("wallets");

  return (
    <div className="flex flex-col gap-3">
      {!isTransfer && (
        <FieldSelect
          label={t("category")}
          placeholder={t("selectCategory")}
          options={categories.map((c) => ({ id: c.id, label: categoryName(c, locale), icon: <CategoryIcon name={c.icon} color={c.color} /> }))}
          value={draft.categoryId}
          onChange={(categoryId) => set({ categoryId })}
          invalid={errors.includes("category")}
        />
      )}
      <FieldSelect
        label={isTransfer ? t("from") : t("wallet")}
        placeholder={t("selectWallet")}
        options={wallets}
        value={draft.walletId}
        onChange={(walletId) => set({ walletId })}
        invalid={walletsInvalid}
      />
      {isTransfer && (
        <FieldSelect
          label={t("to")}
          placeholder={t("selectWallet")}
          options={wallets}
          value={draft.toWalletId}
          onChange={(toWalletId) => set({ toWalletId })}
          invalid={walletsInvalid}
        />
      )}
      <div role="group" aria-label={t("date")} className="flex items-center gap-2">
        <span className={FIELD_LABEL} aria-hidden>{t("date")}</span>
        <button
          type="button"
          aria-pressed={draft.day === today}
          onClick={() => set({ day: today })}
          className={`${CONTROL} shrink-0 px-4 aria-pressed:border-brand aria-pressed:bg-brand/10 aria-pressed:text-brand`}
        >
          {t("today")}
        </button>
        {/* Same look as the dropdowns above: the day in words, with the native picker invisible on top. */}
        <label className={`${CONTROL} relative min-w-0 flex-1 justify-between gap-2 px-3 ${draft.day !== today ? "border-brand text-brand" : ""}`}>
          <span className="truncate">{format.dateTime(new Date(`${draft.day}T12:00:00+06:00`), { day: "numeric", month: "short", year: "numeric" })}</span>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="date"
            lang={locale}
            max={today}
            value={draft.day}
            onChange={(e) => e.target.value && set({ day: e.target.value })}
            onClick={(e) => e.currentTarget.showPicker?.()} // desktop Chrome opens the picker only from its own icon
            aria-label={t("pickDate")}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      <input
        type="text"
        maxLength={NOTE_MAX}
        value={draft.note}
        onChange={(e) => set({ note: e.target.value })}
        placeholder={t("note")}
        aria-label={t("note")}
        className="min-h-11 rounded-lg border bg-background px-3 text-base"
      />
    </div>
  );
}
