// The app's own number pad (spec §3): digits, decimal point, + and − for quick sums, backspace.
"use client";

import { Delete } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/i18n/provider";
import { toBanglaDigits } from "@/lib/money";

const KEYS = ["7", "8", "9", "+", "4", "5", "6", "-", "1", "2", "3", "⌫", ".", "0", "00"];
const MAX_LEN = 24;

export function NumberPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("entries");
  const { banglaDigits } = useLocale();

  const press = (k: string) => {
    if (k === "⌫") return onChange(value.slice(0, -1));
    if (value.length >= MAX_LEN) return;
    const last = value.slice(-1);
    // Don't allow two operators in a row, or starting with one.
    if ((k === "+" || k === "-") && (value === "" || "+-.".includes(last))) return;
    onChange(value + k);
  };

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          aria-label={k === "⌫" ? t("backspace") : undefined}
          className={`min-h-12 rounded-lg bg-muted text-xl font-medium tabular-nums active:bg-accent ${k === "⌫" ? "row-span-2 flex items-center justify-center" : ""}`}
        >
          {k === "⌫" ? <Delete className="size-6" /> : k === "-" ? "−" : banglaDigits ? toBanglaDigits(k) : k}
        </button>
      ))}
    </div>
  );
}
