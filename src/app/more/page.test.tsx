// Roadmap step 5b (spec §8 Settings): language (digits follow it) and theme on the More tab — applied at once, remembered, recorded in the settings row.
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
/** The "Month starts on" dropdown's shown day (1 by default): shows which digits are in use. */
const firstDay = () => screen.getByLabelText(/Month starts on|মাস শুরু হয়/).textContent?.replace("▼", ""); // the trigger's arrow
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
  it("has no digits switch: digits follow the language and the choice is recorded", async () => {
    renderMore();
    await waitFor(() => expect(firstDay()).toBe("1"));
    expect(screen.queryByRole("switch", { name: /Digits/ })).toBeNull();

    fireEvent.click(screen.getByRole("switch", { name: /Language/ }));
    await waitFor(() => expect(firstDay()).toBe("১"));
    await waitFor(async () => expect(await settingsRow()).toMatchObject({ language: "bn", bangla_digits: true }));

    fireEvent.click(await screen.findByRole("switch", { name: /ভাষা/ }));
    await waitFor(() => expect(firstDay()).toBe("1"));
    await waitFor(async () => expect(await settingsRow()).toMatchObject({ language: "en", bangla_digits: false }));
  });

  it("applies the theme at once, recolours the status bar and records it", async () => {
    const meta = Object.assign(document.createElement("meta"), { name: "theme-color", content: "#ffffff" });
    document.head.append(meta);
    renderMore();

    const dark = await screen.findByRole("switch", { name: /Dark mode/ });
    await act(async () => fireEvent.click(dark));
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect(dark.getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem("theme")).toBe("dark");
    await waitFor(() => expect(meta.content).toBe("#0a0a0a"));
    await waitFor(async () => expect((await settingsRow())?.theme).toBe("dark"));

    fireEvent.click(dark);
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(false));
    await waitFor(async () => expect((await settingsRow())?.theme).toBe("light"));
    meta.remove();
  });
});
