// Colour swatches + icon grid, shared by the wallet and category sheets.
"use client";

import { useTranslations } from "next-intl";
import { CategoryIcon, ICON_NAMES } from "@/components/entries/CategoryIcon";

export const COLORS = [
  "#16a34a", "#0284c7", "#7c3aed", "#db2777", "#dc2626", "#ea580c",
  "#ca8a04", "#0891b2", "#4f46e5", "#b45309", "#e2136e", "#64748b",
];

interface Props {
  color: string;
  icon: string;
  onChange: (v: { color?: string; icon?: string }) => void;
}

export function LookPicker({ color, icon, onChange }: Props) {
  const t = useTranslations("manage");
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label={t("color")} className="flex flex-wrap gap-1">
        {COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={t("colorN", { n: i + 1 })}
            onClick={() => onChange({ color: c })}
            className="flex size-11 items-center justify-center rounded-full"
          >
            <span
              className="size-8 rounded-full"
              style={{ background: c, outline: c === color ? `2px solid ${c}` : undefined, outlineOffset: 2 }}
            />
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label={t("icon")} className="grid grid-cols-6 gap-1">
        {ICON_NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={name === icon}
            aria-label={t("iconN", { n: i + 1 })}
            onClick={() => onChange({ icon: name })}
            className="flex min-h-11 items-center justify-center rounded-lg aria-checked:ring-2 aria-checked:ring-primary"
          >
            <CategoryIcon name={name} color={name === icon ? color : undefined} />
          </button>
        ))}
      </div>
    </div>
  );
}
