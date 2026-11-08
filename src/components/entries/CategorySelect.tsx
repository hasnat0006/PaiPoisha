// Category picker: one themed dropdown with every category of the entry's type (icon + name), most-used first.
// Replaced the 8-tile grid + More, which looked crowded (user, 2026-11-08). Not a native <select>: its list
// ignores dark mode and can't show icons.
"use client";

import { Shapes } from "lucide-react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { Category } from "@/db/types";
import { useLocale } from "@/i18n/provider";
import { categoryName } from "@/lib/entries";
import { CategoryIcon } from "./CategoryIcon";

interface Props {
  categories: Category[]; // already filtered and sorted by usage
  value: string | null;
  onChange: (id: string) => void;
  invalid: boolean;
}

export function CategorySelect({ categories, value, onChange, invalid }: Props) {
  const t = useTranslations("entries");
  const { locale } = useLocale();
  const selected = categories.find((c) => c.id === value);
  return (
    <Select value={value ?? null} onValueChange={(id) => id && onChange(id as string)}>
      <SelectTrigger aria-label={t("category")} aria-invalid={invalid} className="min-h-12 w-full gap-3 px-3 text-base">
        <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {selected ? (
            <>
              <CategoryIcon name={selected.icon} color={selected.color} />
              <span className="truncate">{categoryName(selected, locale)}</span>
            </>
          ) : (
            <>
              <Shapes className="size-5 text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">{t("category")}</span>
            </>
          )}
        </span>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-[min(var(--available-height),24rem)]">
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id} className="min-h-11 gap-3 text-base">
            <CategoryIcon name={c.icon} color={c.color} />
            {categoryName(c, locale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
