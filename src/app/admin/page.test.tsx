// Admin dashboard: totals and suggestions for admins only, and no tab bar.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/shell/AppShell";
import { I18nProvider } from "@/i18n/provider";
import type { AdminStats } from "@/sync/admin";
import AdminPage from "./page";

const api = vi.hoisted(() => ({ admin: false, setSuggestionStatus: vi.fn(async () => {}) }));
vi.mock("@/sync/admin", () => ({
  isAdmin: async () => api.admin,
  adminStats: async (days: number): Promise<AdminStats> => ({
    users: 12, new_users: 3, active_today: 4, active_7: 6, active_30: 9, entries: 1500, multi_wallet_users: 6, budget_users: 3, new_suggestions: 1,
    daily: Array.from({ length: days }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, "0")}`, sign_ups: 0, sign_ins: 1, active: i, entries: 2 })),
  }),
  listSuggestions: async () => [{ id: "s1", title: "Loan tracker", body: "Who owes me", status: "new", created_at: "2026-11-15T09:00:00Z" }],
  setSuggestionStatus: api.setSuggestionStatus,
}));

const renderAdmin = () => render(<I18nProvider><AppShell><AdminPage /></AppShell></I18nProvider>);

beforeEach(() => {
  localStorage.setItem("mm.language", "en");
  window.history.replaceState({}, "", "/admin/");
});
afterEach(cleanup);

describe("admin dashboard", () => {
  it("shows nothing but a notice to someone who isn't an admin", async () => {
    api.admin = false;
    renderAdmin();
    expect(await screen.findByText(/only for admins/)).toBeTruthy();
    expect(screen.queryByText("Users")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("shows totals, the chart and suggestions to an admin, who can change a status", async () => {
    api.admin = true;
    renderAdmin();
    expect(await screen.findByText("Users")).toBeTruthy();
    expect(screen.getByText("1,500")).toBeTruthy(); // entries logged: a count only
    expect(screen.getByText("50% of users")).toBeTruthy(); // 6 of 12 use 2+ wallets
    expect(screen.getByRole("img", { name: /Active users, line chart/ })).toBeTruthy();
    expect(screen.getByText("Loan tracker")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "7 days" }));
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(7)); // the chart's table: one row a day

    expect(screen.queryByRole("button", { name: "Cumulative" })).toBeNull(); // daily actives can't be summed
    fireEvent.click(screen.getByRole("button", { name: "Sign-ups" }));
    fireEvent.click(screen.getByRole("button", { name: "Cumulative" }));
    expect(screen.getByRole("img", { name: /Sign-ups, line chart/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Planned/ }));
    expect(await screen.findByText("No suggestions here yet.")).toBeTruthy();
  });
});
