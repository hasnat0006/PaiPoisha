// Category picker: the 8 most-used first, then "More" shows the rest (spec §3).
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Category } from "@/db/types";
import { useLocale } from "@/i18n/provider";
import { categoryName } from "@/lib/entries";
import { CategoryIcon } from "./CategoryIcon";

const TOP = 8;

interface Props {
  categories: Category[]; // already filtered and sorted by usage
  value: string | null;
  onChange: (id: string) => void;
  invalid: boolean;
}

export function CategoryGrid({ categories, value, onChange, invalid }: Props) {
  const t = useTranslations("entries");
  const { locale } = useLocale();
  const [showAll, setShowAll] = useState(false);
  const selectedIsHidden = categories.findIndex((c) => c.id === value) >= TOP;
  const shown = showAll || selectedIsHidden ? categories : categories.slice(0, TOP);

  return (
    <fieldset className={`rounded-lg p-1 ${invalid ? "ring-2 ring-destructive" : ""}`}>
      <legend className="sr-only">{t("category")}</legend>
      <div className="grid grid-cols-4 gap-1">
        {shown.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === value}
            onClick={() => onChange(c.id)}
            className="flex min-h-11 flex-col items-center gap-1 rounded-lg p-1 text-xs aria-pressed:bg-primary/10 aria-pressed:ring-2 aria-pressed:ring-primary"
          >
            <CategoryIcon name={c.icon} color={c.color} />
            <span className="line-clamp-2 text-center">{categoryName(c, locale)}</span>
          </button>
        ))}
      </div>
      {categories.length > TOP && !selectedIsHidden && (
        <button type="button" onClick={() => setShowAll(!showAll)} className="min-h-11 w-full text-sm text-muted-foreground">
          {showAll ? t("less") : t("more")}
        </button>
      )}
    </fieldset>
  );
}
