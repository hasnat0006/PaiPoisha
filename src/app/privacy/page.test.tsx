// Spec §11 Privacy: the policy opens for anyone, even on a brand-new phone where the welcome page would show.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/shell/AppShell";
import { db } from "@/db/db";
import { I18nProvider } from "@/i18n/provider";
import PrivacyPage from "./page";

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem("mm.language", "en");
  await db.delete();
  await db.open();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("privacy page", () => {
  it("shows the policy and terms instead of the welcome page on a new phone", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co"); // login exists, so a new phone would get the welcome page
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    window.history.replaceState({}, "", "/privacy/");
    render(<I18nProvider><AppShell><PrivacyPage /></AppShell></I18nProvider>);
    expect(await screen.findByRole("heading", { name: "Privacy & terms" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Terms of use" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open an issue on GitHub" }).getAttribute("href")).toContain("github.com");
    expect(screen.queryByText("Skip for now")).toBeNull();
  });
});
