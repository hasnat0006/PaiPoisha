// The ± button beside a balance box: the iPhone number keyboard has no minus key, so a negative
// balance (a credit card, an overdraft) can't be typed there otherwise.
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** "500" ↔ "-500"; "" → "-". Accepts both - and − (parseSignedAmount does too). */
export function flipSign(value: string): string {
  const s = value.trim();
  return /^[-−]/.test(s) ? s.slice(1) : `-${s}`;
}

export function SignToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("common");
  return (
    <Button type="button" variant="outline" aria-label={t("negative")} className="min-h-11 min-w-11 shrink-0 text-lg tabular-nums" onClick={() => onChange(flipSign(value))}>
      ±
    </Button>
  );
}
