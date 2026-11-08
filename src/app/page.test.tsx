// End-to-end-ish flow for roadmap step 2: add, edit, delete + undo, offline (Dexie only).
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { db } from "@/db/db";
import { I18nProvider } from "@/i18n/provider";
import HomePage from "./page";

const renderPage = () =>
  render(
    <I18nProvider>
      <AppShell>
        <HomePage />
      </AppShell>
      <Toaster />
    </I18nProvider>,
  );

const pad = async (keys: string) => {
  for (const k of keys) fireEvent.click(await screen.findByRole("button", { name: k })); // the sheet loads lazily
};

beforeEach(async () => {
  localStorage.setItem("mm.language", "en"); // English labels and ASCII digits
  await db.delete();
  await db.open();
});
afterEach(cleanup);

describe("adding and listing entries", () => {
  it("adds an expense in amount + 3 taps, edits it, deletes it and undoes the delete", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add your first expense" }));

    // amount → category → Save (wallet and date are pre-filled)
    await pad("150");
    fireEvent.click(await screen.findByRole("button", { name: "Groceries" }));
    expect(screen.queryByRole("button", { name: "7" })).toBeNull(); // the pad steps aside so wallet/date/note fit
    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(screen.getByRole("button", { name: "7" })).toBeTruthy(); // tapping the amount brings it back
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const row = await screen.findByRole("button", { name: /Groceries.*Cash.*−৳150/ });
    const [tx] = await db.transactions.toArray();
    expect(tx).toMatchObject({ type: "expense", amount_paisa: 15000, _dirty: 1, deleted_at: null });

    // edit: tap the row, add a digit, save
    fireEvent.click(row);
    await pad("0");
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: /−৳1,500/ });
    expect((await db.transactions.get(tx.id))?.amount_paisa).toBe(150000);

    // delete, then undo
    fireEvent.click(screen.getByRole("button", { name: /−৳1,500/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await screen.findByText("No entries yet");
    expect((await db.transactions.get(tx.id))?.deleted_at).not.toBeNull();
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Undo" })));
    await screen.findByRole("button", { name: /−৳1,500/ });
    expect((await db.transactions.get(tx.id))?.deleted_at).toBeNull();
  });

  it("asks for an amount and a category before saving", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add your first expense" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Enter an amount");
    await pad("50");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Choose a category"));
    expect(await db.transactions.count()).toBe(0);
  });

  it("explains that a transfer needs a second wallet", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add your first expense" }));
    fireEvent.click(await screen.findByRole("tab", { name: "Transfer" }));
    expect(await screen.findByText("Add a second wallet to make a transfer")).toBeTruthy();
    const save = screen.getAllByRole("button", { name: "Save" })[0];
    expect(within(save.parentElement!).getByRole("button", { name: "Save" })).toHaveProperty("disabled", true);
  });
});
