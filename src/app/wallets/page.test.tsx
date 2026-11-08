// Roadmap step 3 flows: wallets (add, adjust, archive) and categories (rename, hide) update everywhere.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { db } from "@/db/db";
import { insertRow } from "@/db/repo";
import { ensureSeeded } from "@/db/seed";
import type { Transaction } from "@/db/types";
import { I18nProvider } from "@/i18n/provider";
import CategoriesPage from "../categories/page";
import HomePage from "../page";
import WalletsPage from "./page";

const renderIn = (page: React.ReactNode) =>
  render(
    <I18nProvider>
      <AppShell>{page}</AppShell>
      <Toaster />
    </I18nProvider>,
  );
const click = async (name: string | RegExp) => fireEvent.click(await screen.findByRole("button", { name }));
const total = async (text: string) =>
  waitFor(() => expect(screen.getByText("Total balance").nextElementSibling?.textContent).toBe(text));

beforeEach(async () => {
  localStorage.setItem("mm.language", "en");
  await db.delete();
  await db.open();
  await ensureSeeded("Cash");
});
afterEach(cleanup);

describe("wallets screen", () => {
  it("adds a bKash wallet, adjusts Cash and archives bKash, updating the total each time", async () => {
    renderIn(<WalletsPage />);
    await total("৳0");

    await click("Add wallet");
    await click("bKash");
    fireEvent.change(screen.getByLabelText("Opening balance"), { target: { value: "500" } });
    await click("Save");
    await total("৳500");
    expect(await screen.findByRole("button", { name: /bKash.*bKash.*৳500/ })).toBeTruthy();

    await click(/Cash.*৳0/);
    fireEvent.change(await screen.findByLabelText("Real balance"), { target: { value: "-200" } });
    await click("Adjust");
    await total("৳300");
    const adj = (await db.transactions.toArray())[0];
    expect(adj).toMatchObject({ type: "expense", amount_paisa: 20000 }); // ৳200

    await click(/bKash.*৳500/);
    await click("Archive");
    await total("−৳200");
    expect(await screen.findByText("Archived")).toBeTruthy();
  });

  it("won't archive or delete the only wallet", async () => {
    renderIn(<WalletsPage />);
    await click(/Cash/);
    expect((await screen.findByRole("button", { name: "Archive" })).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Delete" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("You need at least one active wallet.")).toBeTruthy();
  });
});

describe("categories screen", () => {
  it("a renamed category shows the new name on old entries", async () => {
    const [cash] = await db.wallets.toArray();
    const groceries = (await db.categories.toArray()).find((c) => c.key === "groceries")!;
    await insertRow<Transaction>("transactions", {
      type: "expense", amount_paisa: 15000, wallet_id: cash.id, to_wallet_id: null, category_id: groceries.id,
      fee_paisa: 0, note: "", occurred_at: "2026-11-01T10:00:00+06:00",
    });

    const { unmount } = renderIn(<CategoriesPage />);
    await click("Groceries");
    fireEvent.change(await screen.findByLabelText("English name"), { target: { value: "Bazaar" } });
    await click("Save");
    await screen.findByRole("button", { name: "Bazaar" });
    unmount();

    renderIn(<HomePage />);
    expect(await screen.findByRole("button", { name: /Bazaar.*−৳150/ })).toBeTruthy();
  });

  it("a hidden category leaves the add sheet but can't be deleted while it has entries", async () => {
    renderIn(<CategoriesPage />);
    await click("Transport");
    await click("Hide");
    expect(await screen.findByText("Hidden")).toBeTruthy();
    cleanup();

    renderIn(<HomePage />);
    await click("Add your first expense");
    fireEvent.click(await screen.findByRole("combobox", { name: "Category" }));
    await screen.findByRole("option", { name: "Groceries" });
    expect(screen.queryByRole("option", { name: "Transport" })).toBeNull();
  });
});
