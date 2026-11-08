// Roadmap step 8 (spec §9): the quick-add link opens the sheet pre-filled and never saves on its own.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppShell } from "@/components/shell/AppShell";
import { db } from "@/db/db";
import { I18nProvider } from "@/i18n/provider";
import AddPage from "./page";

beforeEach(async () => {
  localStorage.setItem("mm.language", "en");
  await db.delete();
  await db.open();
});
afterEach(cleanup);

describe("/add quick-add link", () => {
  it("opens the add sheet with amount, category and note filled in, and saves only on Save", async () => {
    window.history.replaceState({}, "", "/add/?type=expense&amount=150&cat=transport&note=rickshaw");
    render(<I18nProvider><AppShell><AddPage /></AppShell></I18nProvider>);

    const amount = await screen.findByRole("button", { name: "Amount" });
    expect(amount.textContent).toBe("৳150");
    expect(screen.getByRole("combobox", { name: "Category" }).textContent).toContain("Transport");
    expect((screen.getByLabelText("Note (optional)") as HTMLInputElement).value).toBe("rickshaw");
    expect(await db.transactions.count()).toBe(0); // nothing saved yet

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => expect(await db.transactions.count()).toBe(1));
    expect((await db.transactions.toArray())[0]).toMatchObject({ amount_paisa: 15000, note: "rickshaw" });
  });

  it("ignores unknown values and still opens a normal add sheet", async () => {
    window.history.replaceState({}, "", "/add/?type=loan&cat=pizza&amount=abc");
    render(<I18nProvider><AppShell><AddPage /></AppShell></I18nProvider>);
    expect((await screen.findByRole("button", { name: "Amount" })).textContent).toBe("৳0");
    expect(screen.getByRole("tab", { name: "Expense" }).getAttribute("aria-selected")).toBe("true");
  });
});
