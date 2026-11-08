/**
 * Budget/report periods with a custom month start day (money-rules skill).
 * Start day 7: the "2026-11" period is 7 Nov 00:00 → 6 Dec 23:59:59.999, Asia/Dhaka.
 * The only place periods are calculated; never inline this.
 */
import { dhakaDay } from "./entries";

export interface Period {
  key: string; // "YYYY-MM" of the period's start
  start: string; // ISO instant (inclusive)
  end: string; // ISO instant (exclusive) = next period's start
}

/** Used until the user picks a month start day (settings.month_start_day). */
export const DEFAULT_START_DAY = 1;

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number) => {
  const d = new Date(Date.UTC(y, m - 1, 1)); // normalises month 0 / 13
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};
const startOf = (key: string, startDay: number) => new Date(`${key}-${pad(startDay)}T00:00:00+06:00`).toISOString();

/** The period with this key. */
export function periodFromKey(key: string, startDay: number): Period {
  const [y, m] = key.split("-").map(Number);
  return { key, start: startOf(key, startDay), end: startOf(keyOf(y, m + 1), startDay) };
}

/** The period a moment falls in. */
export function getPeriod(at: string | Date, startDay: number): Period {
  const [y, m, d] = dhakaDay(at).split("-").map(Number);
  return periodFromKey(keyOf(y, d >= startDay ? m : m - 1), startDay);
}

/** The period n steps before/after the given key. */
export function shiftPeriod(key: string, n: number, startDay: number): Period {
  const [y, m] = key.split("-").map(Number);
  return periodFromKey(keyOf(y, m + n), startDay);
}

export const inPeriod = (occurredAt: string, p: Period) => {
  const t = new Date(occurredAt).getTime();
  return t >= new Date(p.start).getTime() && t < new Date(p.end).getTime();
};
