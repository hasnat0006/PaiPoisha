// End-to-end-ish flow for roadmap step 2: add, edit, delete + undo, offline (Dexie only).
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/** Tap the amount (the pad opens only then), then the keys. The sheet loads lazily. */
const pad = async (keys: string) => {
  fireEvent.click(await screen.findByRole("button", { name: "Amount" }));
  for (const k of keys) fireEvent.click(await screen.findByRole("button", { name: k }));
};
/** Texts of the toasts on screen (sonner renders them outside the page tree). */
const toasts = () => [...document.querySelectorAll("[data-sonner-toast]")].map((el) => el.textContent ?? "");

const pickCategory = async (name: string) => {
  fireEvent.click(await screen.findByRole("combobox", { name: "Category" })); // also the tap that makes the pad step aside
  fireEvent.click(await screen.findByRole("option", { name }));
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

    expect(screen.queryByRole("button", { name: "7" })).toBeNull(); // the pad opens only when the amount is tapped
    // amount → category → Save (wallet and date are pre-filled)
    await pad("150");
    await pickCategory("Groceries");
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

  it("keeps an unsaved entry when the sheet is closed, and starts fresh after saving it", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add your first expense" }));
    await pad("75");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }); // close without saving
    await waitFor(() => expect(screen.queryByRole("button", { name: "Save" })).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Add your first expense" }));
    expect((await screen.findByRole("button", { name: "Amount" })).textContent).toContain("75"); // still there
    await pickCategory("Groceries");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: /Groceries.*−৳75/ });

    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));
    expect((await screen.findByRole("button", { name: "Amount" })).textContent).toBe("৳0"); // saved: nothing kept
  });

  it("asks for an amount and a category before saving", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add your first expense" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Enter an amount");
    await waitFor(() => expect(toasts().join()).toContain("Enter an amount")); // inline + toast (user, 2026-11-08)
    await pad("50");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Choose a category"));
    await waitFor(() => expect(toasts().join()).toContain("Choose a category"));
    expect(toasts().filter((t) => t.includes("Enter an amount"))).toHaveLength(0); // replaced, not stacked
    expect(await db.transactions.count()).toBe(0);
  });

  it("says so when an entry can't be deleted, and keeps the sheet open", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add your first expense" }));
    await pad("150");
    await pickCategory("Groceries");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(await screen.findByRole("button", { name: /Groceries.*−৳150/ }));

    // The next database update (the soft delete) fails, as on a phone that is out of storage.
    const failing = vi.spyOn(Object.getPrototypeOf(db.transactions), "update").mockRejectedValueOnce(new Error("disk full"));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(toasts().join()).toContain("Couldn’t delete. Please try again"));
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy(); // still open, nothing lost
    expect((await db.transactions.toArray())[0].deleted_at).toBeNull();
    failing.mockRestore();
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
