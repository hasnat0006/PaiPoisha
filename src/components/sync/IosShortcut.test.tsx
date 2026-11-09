// iPhone Shortcut setup on the More tab: sign-in hint when signed out; "Make my key" shows the new key once.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { newShortcutKey } = vi.hoisted(() => ({ newShortcutKey: vi.fn(async () => "abc123key") }));
vi.mock("@/sync/shortcutKey", () => ({ newShortcutKey }));

import { I18nProvider } from "@/i18n/provider";
import { setStatus } from "@/sync/status";
import { IosShortcut } from "./IosShortcut";

const status = { known: true, email: "a@example.com", pending: 0, lastSyncedAt: null, lastError: null };
const open = () => {
  render(
    <I18nProvider>
      <IosShortcut />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByText("iPhone: save from a Shortcut"));
};

beforeEach(() => {
  localStorage.setItem("mm.language", "en");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("IosShortcut", () => {
  it("asks a signed-out user to sign in, with no key button", () => {
    setStatus({ ...status, state: "signed_out", email: null });
    open();
    expect(screen.getByText(/Sign in with Google above/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Make my key" })).toBeNull();
  });

  it("makes a key and shows it to copy", async () => {
    setStatus({ ...status, state: "up_to_date" });
    open();
    fireEvent.click(screen.getByRole("button", { name: "Make my key" }));
    expect(((await screen.findByLabelText("Shortcut key")) as HTMLInputElement).value).toBe("abc123key");
    expect(newShortcutKey).toHaveBeenCalledOnce();
  });
});
