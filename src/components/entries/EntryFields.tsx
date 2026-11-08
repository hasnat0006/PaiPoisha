// The middle of the add sheet, one labelled row each (user, 2026-11-08): category (or From/To for transfers)
// and wallet as dropdowns, then the date (Today or any picked day) and the note.
"use client";

import { useTranslations } from "next-intl";
import type { Category } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import type { useEntryForm } from "@/features/entries/useEntryForm";
import { useLocale } from "@/i18n/provider";
import { categoryName, dhakaDay, NOTE_MAX } from "@/lib/entries";
import { CategoryIcon } from "./CategoryIcon";
import { FIELD_LABEL, FieldSelect } from "./FieldSelect";

interface Props {
  data: EntriesData;
  form: ReturnType<typeof useEntryForm>;
  categories: Category[]; // for the current type, sorted by usage
}

export function EntryFields({ data, form, categories }: Props) {
  const t = useTranslations("entries");
  const { locale } = useLocale();
  const { draft, set, errors } = form;
  const today = dhakaDay(new Date());
  const wallets = data.activeWallets.map((w) => ({ id: w.id, label: w.name, icon: <CategoryIcon name={w.icon} color={w.color} /> }));
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
          className="min-h-11 shrink-0 rounded-md border px-4 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          {t("today")}
        </button>
        <input
          type="date"
          lang={locale}
          max={today}
          value={draft.day}
          onChange={(e) => e.target.value && set({ day: e.target.value })}
          aria-label={t("pickDate")}
          className="min-h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
        />
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
