// Roadmap step 5 (spec §5 Done when): setting a budget, adding entries and changing the month start day update the bars.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { db } from "@/db/db";
import { insertRow } from "@/db/repo";
import { ensureSeeded } from "@/db/seed";
import type { Transaction } from "@/db/types";
import { setMonthStartDay } from "@/features/settings/settingsActions";
import { I18nProvider } from "@/i18n/provider";
import BudgetsPage from "./page";

const ids: Record<string, string> = {};
const spend = (amount_paisa: number, occurred_at: string) =>
  insertRow<Transaction>("transactions", {
    type: "expense", amount_paisa, wallet_id: ids.cash, to_wallet_id: null, category_id: ids.groceries,
    fee_paisa: 0, note: "", occurred_at,
  });

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-20T12:00:00+06:00"));
  localStorage.setItem("mm.language", "en");
  window.history.replaceState({}, "", "/budgets/");
  await db.delete();
  await db.open();
  await ensureSeeded("Cash");
  ids.cash = (await db.wallets.toArray())[0].id;
  ids.groceries = (await db.categories.toArray()).find((c) => c.key === "groceries")!.id;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("budgets", () => {
  it("updates the bar when a budget is set, entries are added and the start day changes", async () => {
    render(<I18nProvider><AppShell><BudgetsPage /></AppShell><Toaster /></I18nProvider>);
    await screen.findByText("No budgets for this month yet");

    // set: Groceries ৳1,000
    fireEvent.click(screen.getByRole("button", { name: "Add budget" }));
    fireEvent.change(await screen.findByLabelText("Category"), { target: { value: ids.groceries } });
    fireEvent.change(screen.getByLabelText("Monthly limit"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("৳1,000 left");

    // add entries: ৳800 on 10 Nov → amber, 11 days to go (20 Nov → 30 Nov)
    await act(() => spend(80000, "2026-11-10T10:00:00+06:00"));
    await screen.findByText("৳200 left · 11 days to go");

    // ৳300 more → over
    await act(() => spend(30000, "2026-11-18T10:00:00+06:00"));
    await screen.findByText("৳100 over");

    // start day 15: the period becomes 15 Nov → 14 Dec, so the 10 Nov entry drops out
    await act(() => setMonthStartDay(15, "en"));
    await screen.findByText("৳700 left");
  });

  it("carries last month's budget into this month", async () => {
    await insertRow("budgets", { category_id: null, month: "2026-10", limit_paisa: 500000 }); // overall ৳5,000 in October
    render(<I18nProvider><AppShell><BudgetsPage /></AppShell></I18nProvider>);
    await screen.findByText("Overall");
    await waitFor(() => expect(screen.getByText("৳5,000 left")).toBeTruthy());
  });
});
