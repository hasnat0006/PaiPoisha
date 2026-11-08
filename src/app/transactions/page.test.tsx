// Roadmap step 4 flows: Home numbers for the period, and the filtered transaction list + total.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/shell/AppShell";
import { db } from "@/db/db";
import { insertRow } from "@/db/repo";
import { ensureSeeded } from "@/db/seed";
import type { Transaction, Wallet } from "@/db/types";
import { I18nProvider } from "@/i18n/provider";
import HomePage from "../page";
import TransactionsPage from "./page";

const renderIn = (page: React.ReactNode) => render(<I18nProvider><AppShell>{page}</AppShell></I18nProvider>);
const ids: Record<string, string> = {};

const add = (o: Partial<Transaction>) =>
  insertRow<Transaction>("transactions", {
    type: "expense", amount_paisa: 1000, wallet_id: ids.cash, to_wallet_id: null, category_id: ids.transport,
    fee_paisa: 0, note: "", occurred_at: "2026-10-10T10:00:00+06:00", ...o,
  });

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00+06:00"));
  localStorage.setItem("mm.language", "en");
  window.history.replaceState({}, "", "/");
  await db.delete();
  await db.open();
  await ensureSeeded("Cash");
  const [cash] = await db.wallets.toArray();
  const bkash = await insertRow<Wallet>("wallets", { ...cash, name: "bKash", kind: "mfs", provider: "bkash", sort_order: 1 } as Wallet);
  const cats = await db.categories.toArray();
  Object.assign(ids, { cash: cash.id, bkash: bkash.id });
  for (const c of cats) if (c.key) ids[c.key] = c.id;

  await add({ wallet_id: ids.bkash, amount_paisa: 12000 }); // ✓ bKash Transport Oct ৳120
  await add({ wallet_id: ids.bkash, amount_paisa: 4500, note: "CNG" }); // ✓ ৳45
  await add({ wallet_id: ids.bkash, amount_paisa: 9900, occurred_at: "2026-09-30T10:00:00+06:00" }); // September
  await add({ wallet_id: ids.bkash, category_id: ids.groceries, amount_paisa: 30000 }); // Oct groceries ৳300
  await add({ type: "income", category_id: ids.salary, amount_paisa: 5000000 }); // Oct salary ৳50,000
  await add({ type: "transfer", category_id: null, to_wallet_id: ids.bkash, amount_paisa: 100000, fee_paisa: 1850 }); // fee ৳18.50
  await add({ type: "income", category_id: ids.adjustment, amount_paisa: 77700 }); // adjustment: not in totals
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Home", () => {
  it("shows Income, Spent and Net for the chosen period", async () => {
    renderIn(<HomePage />);
    const value = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
    await waitFor(() => expect(value("Spent")).toBe("৳483.50")); // 120 + 45 + 300 + 18.50 fee
    expect(value("Income")).toBe("৳50,000");
    expect(value("Net")).toBe("+৳49,516.50");

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await waitFor(() => expect(value("Spent")).toBe("৳99"));
    expect(screen.getByRole("button", { name: "Next month" }).hasAttribute("disabled")).toBe(false);
  });
});

describe("Transactions", () => {
  it("bKash + Transport + October shows exactly the right entries and total", async () => {
    window.history.replaceState({}, "", `/transactions/?period=2026-10&category=${ids.transport}`);
    renderIn(<TransactionsPage />);
    fireEvent.change(await screen.findByLabelText("Wallet"), { target: { value: ids.bkash } });
    await waitFor(() => expect(screen.getByText("2 entries")).toBeTruthy());
    expect(screen.getByText("2 entries").nextElementSibling?.textContent).toBe("−৳165");
    expect(screen.getByRole("button", { name: "Remove filter: bKash" })).toBeTruthy();
  });

  it("searches by amount and removes a filter chip", async () => {
    window.history.replaceState({}, "", "/transactions/?type=expense");
    renderIn(<TransactionsPage />);
    await screen.findByText("4 entries");
    fireEvent.change(screen.getByLabelText("Search note, category or amount"), { target: { value: "45" } });
    await screen.findByText("1 entry");
    fireEvent.change(screen.getByLabelText("Search note, category or amount"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: Expense" }));
    await screen.findByText("7 entries");
  });
});
