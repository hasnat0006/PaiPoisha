// Admin dashboard: one series as a line, per day or as a running total, with a tap/hover crosshair readout.
// One series at a time, so there is one axis and no legend; a hidden table gives screen readers the numbers.
"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { AdminStats } from "@/sync/admin";

export type Series = "sign_ins" | "active" | "sign_ups" | "entries";
export const SERIES: Series[] = ["active", "sign_ins", "sign_ups", "entries"];
export type Mode = "daily" | "total";

/** The line's points. Running totals start from what existed before the range (users, entries); daily actives can't be summed. */
export function chartValues(stats: AdminStats, series: Series, mode: Mode): number[] {
  const daily = stats.daily.map((d) => d[series]);
  if (mode === "daily" || series === "active") return daily;
  const inRange = daily.reduce((a, v) => a + v, 0);
  const start = series === "sign_ups" ? stats.users - inRange : series === "entries" ? Math.max(0, stats.entries - inRange) : 0;
  let run = Math.max(0, start);
  return daily.map((v) => (run += v));
}

const W = 600;
const H = 200;

export function DailyChart(props: { stats: AdminStats; series: Series; mode: Mode; num: (n: number) => string }) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const [hover, setHover] = useState<number | null>(null);
  const days = props.stats.daily.map((d) => d.day);
  const values = chartValues(props.stats, props.series, props.mode);
  if (values.length === 0) return null;

  // A running total starts at its lowest point, so growth is visible; daily counts keep a 0 baseline (and the fill).
  const total = props.mode === "total" && props.series !== "active";
  const max = Math.max(1, ...values);
  const min = total ? Math.min(...values) : 0;
  const span = Math.max(1, max - min);
  const x = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * W);
  const y = (v: number) => H - ((v - min) / span) * H;
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const date = (day: string) => format.dateTime(new Date(`${day}T00:00:00+06:00`), { day: "numeric", month: "short" });
  const shown = hover ?? values.length - 1;
  const label = t(`series.${props.series}`);
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (values.length - 1));
    setHover(Math.min(values.length - 1, Math.max(0, i)));
  };

  return (
    <div>
      <p className="mb-2 h-5 text-sm text-muted-foreground" aria-live="polite">
        {date(days[shown])} · <span className="font-medium text-foreground tabular-nums">{props.num(values[shown])}</span> {label}
      </p>
      <div className="flex gap-2">
        <div className="flex h-48 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums" aria-hidden>
          <span>{props.num(max)}</span>
          <span>{props.num(min)}</span>
        </div>
        <div
          className="relative h-48 flex-1 touch-none border-b"
          role="img"
          aria-label={t("chartLabel", { series: label })}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setHover(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible text-brand" aria-hidden>
            <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="stroke-border" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            {!total && <path d={`${line}L${x(values.length - 1)},${H}L${x(0)},${H}Z`} fill="currentColor" opacity="0.12" />}
            <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} className="stroke-muted-foreground" vectorEffect="non-scaling-stroke" />}
          </svg>
          {/* An HTML dot stays round; an SVG circle would stretch with the chart. */}
          <span
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-brand"
            style={{ left: `${(x(shown) / W) * 100}%`, top: `${(y(values[shown]) / H) * 100}%` }}
            aria-hidden
          />
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-8 text-xs text-muted-foreground" aria-hidden>
        <span>{date(days[0])}</span>
        <span>{date(days[days.length - 1])}</span>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {days.map((d, i) => (
            <tr key={d}>
              <th scope="row">{date(d)}</th>
              <td>{props.num(values[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
