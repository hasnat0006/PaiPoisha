// ‹ November 2026 › — steps through periods (spec §6). Can't go past the current period.
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { getPeriod, shiftPeriod, type Period } from "@/lib/period";

interface Props {
  period: Period;
  startDay: number;
  onChange: (p: Period) => void;
}

export function PeriodSwitcher({ period, startDay, onChange }: Props) {
  const t = useTranslations("periods");
  const format = useFormatter();
  const isCurrent = period.key >= getPeriod(new Date(), startDay).key;
  const label = format.dateTime(new Date(`${period.key}-15T12:00:00+06:00`), { month: "long", year: "numeric" });
  const btn = "flex size-11 items-center justify-center rounded-full disabled:opacity-30";
  return (
    <div className="flex items-center justify-between">
      <button type="button" className={btn} onClick={() => onChange(shiftPeriod(period.key, -1, startDay))} aria-label={t("previous")}>
        <ChevronLeft className="size-5" />
      </button>
      <span className="text-base font-medium">{label}</span>
      <button type="button" className={btn} disabled={isCurrent} onClick={() => onChange(shiftPeriod(period.key, 1, startDay))} aria-label={t("next")}>
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
