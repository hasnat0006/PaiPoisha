// Roadmap step 5b (spec §8 Settings): digits and theme on the More tab — applied at once, remembered, recorded in the settings row.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppShell } from "@/components/shell/AppShell";
import { db } from "@/db/db";
import { I18nProvider } from "@/i18n/provider";
import MorePage from "./page";

const renderMore = () =>
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider><AppShell><MorePage /></AppShell></I18nProvider>
    </ThemeProvider>,
  );
/** First "Month starts on" option: shows which digits are in use. */
const firstDay = () => (screen.getByLabelText(/Month starts on|মাস শুরু হয়/) as HTMLSelectElement).options[0].textContent;
const settingsRow = async () => (await db.settings.toArray())[0];

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem("mm.language", "en");
  document.documentElement.className = "";
  window.history.replaceState({}, "", "/more/");
  await db.delete();
  await db.open();
});
afterEach(cleanup);

describe("settings on the More tab", () => {
  it("switches digits, remembers a manual choice, and resets it when the language changes", async () => {
    renderMore();
    await waitFor(() => expect(firstDay()).toBe("1"));

    fireEvent.click(screen.getByRole("button", { name: /Digits/ }));
    await waitFor(() => expect(firstDay()).toBe("১"));
    expect(localStorage.getItem("mm.digits")).toBe("bn");
    await waitFor(async () => expect((await settingsRow())?.bangla_digits).toBe(true));

    // remembered after a restart
    cleanup();
    renderMore();
    await waitFor(() => expect(firstDay()).toBe("১"));

    // language change → digits follow the new language's default; the manual choice is gone
    fireEvent.click(screen.getByRole("button", { name: /Language/ }));
    await screen.findByRole("button", { name: /ভাষা/ });
    fireEvent.click(screen.getByRole("button", { name: /ভাষা/ }));
    await waitFor(() => expect(firstDay()).toBe("1"));
    expect(localStorage.getItem("mm.digits")).toBeNull();
    await waitFor(async () => expect(await settingsRow()).toMatchObject({ language: "en", bangla_digits: false }));
  });

  it("applies the theme at once, recolours the status bar and records it", async () => {
    const meta = Object.assign(document.createElement("meta"), { name: "theme-color", content: "#ffffff" });
    document.head.append(meta);
    renderMore();

    const dark = await screen.findByRole("button", { name: "Dark" });
    await act(async () => fireEvent.click(dark));
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect(dark.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("theme")).toBe("dark");
    await waitFor(() => expect(meta.content).toBe("#0a0a0a"));
    await waitFor(async () => expect((await settingsRow())?.theme).toBe("dark"));

    fireEvent.click(screen.getByRole("button", { name: "Match phone" }));
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(false)); // test phone is light
    await waitFor(async () => expect((await settingsRow())?.theme).toBe("system"));
    meta.remove();
  });
});
