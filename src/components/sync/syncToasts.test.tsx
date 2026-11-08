// Sync toasts (user, 2026-11-08): one red toast when sync turns to Error, "Synced again" on recovery,
// and Sync now always answers.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runnerSyncNow } = vi.hoisted(() => ({ runnerSyncNow: vi.fn(async () => {}) }));
vi.mock("@/sync/runner", () => ({ syncNow: runnerSyncNow }));

import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/provider";
import { setStatus } from "@/sync/status";
import { AccountSection } from "./AccountSection";
import { useSyncToasts } from "./useSyncToasts";

const toasts = () => [...document.querySelectorAll("[data-sonner-toast]")].map((el) => el.textContent ?? "");
function Probe() {
  useSyncToasts();
  return null;
}
const renderWith = (ui: React.ReactNode) =>
  render(
    <I18nProvider>
      {ui}
      <Toaster />
    </I18nProvider>,
  );

beforeEach(() => {
  localStorage.setItem("mm.language", "en");
  setStatus({ state: "up_to_date", known: true, email: "a@example.com", pending: 0, lastSyncedAt: null, lastError: null });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("sync toasts", () => {
  it("shows one error toast with the reason when sync turns to Error, then 'Synced again'", async () => {
    renderWith(<Probe />);
    act(() => setStatus({ state: "syncing", lastError: "down" })); // 1st and 2nd failures stay quiet
    expect(toasts()).toHaveLength(0);
    act(() => setStatus({ state: "error", lastError: "Failed to fetch" }));
    await waitFor(() => expect(toasts().join()).toContain("Couldn’t sync: Failed to fetch"));
    act(() => setStatus({ state: "error", lastError: "Failed to fetch" })); // still failing: no second toast
    expect(toasts()).toHaveLength(1);
    act(() => setStatus({ state: "up_to_date", lastError: null }));
    await waitFor(() => expect(toasts().join()).toContain("Synced again"));
    expect(toasts()).toHaveLength(1); // the same slot, replaced
  });

  it("answers Sync now with Synced, or with the error", async () => {
    renderWith(<AccountSection row="flex" />);
    fireEvent.click(await screen.findByRole("button", { name: "Sync now" }));
    await waitFor(() => expect(toasts().join()).toContain("Synced"));

    runnerSyncNow.mockImplementationOnce(async () => setStatus({ state: "syncing", lastError: "JWT expired" }));
    fireEvent.click(screen.getByRole("button", { name: "Sync now" }));
    await waitFor(() => expect(toasts().join()).toContain("Couldn’t sync: JWT expired"));
  });
});
