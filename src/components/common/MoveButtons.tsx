// Up / down buttons for reordering a row (used instead of drag; see decisions.md).
"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
}

export function MoveButtons({ index, count, onMove }: Props) {
  const t = useTranslations("manage");
  const btn = "flex size-11 items-center justify-center rounded-lg text-muted-foreground disabled:opacity-30";
  return (
    <span className="flex shrink-0">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(-1)} aria-label={t("moveUp")}>
        <ChevronUp className="size-5" />
      </button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(1)} aria-label={t("moveDown")}>
        <ChevronDown className="size-5" />
      </button>
    </span>
  );
}
