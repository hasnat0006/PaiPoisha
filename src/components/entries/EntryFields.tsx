// The middle of the add sheet: category grid (or From/To for transfers), wallet chips, date and note.
"use client";

import { useTranslations } from "next-intl";
import type { Category } from "@/db/types";
import type { EntriesData } from "@/features/entries/useEntries";
import type { useEntryForm } from "@/features/entries/useEntryForm";
import { useLocale } from "@/i18n/provider";
import { addDays, dhakaDay, NOTE_MAX } from "@/lib/entries";
import { CategoryGrid } from "./CategoryGrid";
import { ChipGroup } from "./ChipGroup";

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
  const wallets = data.activeWallets.map((w) => ({ id: w.id, label: w.name }));
  const isTransfer = draft.type === "transfer";

  return (
    <div className="flex flex-col gap-3">
      {!isTransfer && (
        <CategoryGrid
          categories={categories}
          value={draft.categoryId}
          onChange={(categoryId) => set({ categoryId })}
          invalid={errors.includes("category")}
        />
      )}
      <ChipGroup
        label={isTransfer ? t("from") : t("wallet")}
        options={wallets}
        value={draft.walletId}
        onChange={(walletId) => set({ walletId })}
        invalid={errors.includes("wallets")}
      />
      {isTransfer && (
        <ChipGroup
          label={t("to")}
          options={wallets}
          value={draft.toWalletId}
          onChange={(toWalletId) => set({ toWalletId })}
          invalid={errors.includes("wallets")}
        />
      )}
      <ChipGroup
        label={t("date")}
        options={[
          { id: today, label: t("today") },
          { id: addDays(today, -1), label: t("yesterday") },
        ]}
        value={draft.day}
        onChange={(day) => set({ day })}
      >
        <input
          type="date"
          lang={locale}
          max={today}
          value={draft.day}
          onChange={(e) => e.target.value && set({ day: e.target.value })}
          aria-label={t("date")}
          className="min-h-11 shrink-0 rounded-full border bg-background px-3 text-sm"
        />
      </ChipGroup>
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
