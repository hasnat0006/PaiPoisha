// Development only: made-up admin totals and suggestions, so the dashboard can be seen without Supabase.
import type { AdminStats, ClientError, DayStats, Suggestion } from "@/sync/admin";

export function demoStats(days: number): AdminStats {
  const today = Date.now();
  const daily: DayStats[] = Array.from({ length: days }, (_, i) => {
    const day = new Date(today - (days - 1 - i) * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    const wave = Math.round(20 + 15 * Math.sin(i / 3) + i * 0.6);
    return { day, active: wave, sign_ins: Math.round(wave / 4), sign_ups: i % 4 === 0 ? 3 : 1, entries: wave * 6 };
  });
  return {
    users: 128, new_users: daily.reduce((a, d) => a + d.sign_ups, 0), active_today: daily[days - 1].active,
    active_7: 61, active_30: 94, entries: 18_240, multi_wallet_users: 71, budget_users: 23, new_suggestions: 2, daily,
  };
}

export const DEMO_SUGGESTIONS: Suggestion[] = [
  { id: "1", title: "Loan tracker", body: "Track money I lent to friends and who still owes me.", status: "new", created_at: "2026-11-15T09:00:00Z" },
  { id: "2", title: "Home screen widget", body: "", status: "new", created_at: "2026-11-14T12:00:00Z" },
  { id: "3", title: "Monthly PDF report", body: "One page with income, spending and budgets for the month.", status: "planned", created_at: "2026-11-10T08:00:00Z" },
  { id: "4", title: "Dark mode", body: "Easier on the eyes at night.", status: "done", created_at: "2026-11-02T08:00:00Z" },
];

export const DEMO_ERRORS: ClientError[] = [
  { message: "TypeError: Cannot read properties of undefined (reading 'id') @ EntrySheet (/_next/static/chunks/app.js:1:2040)", page: "/add/", times: 3, last_seen: "2026-11-16T08:00:00Z" },
  { message: "ChunkLoadError: Loading chunk 812 failed.", page: "/transactions/", times: 1, last_seen: "2026-11-14T10:00:00Z" },
];
