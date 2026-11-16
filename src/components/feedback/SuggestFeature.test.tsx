// Settings → Suggest a feature: signed-in only; sends the trimmed title and details, then closes.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/provider";
import { setStatus } from "@/sync/status";
import { SuggestFeature } from "./SuggestFeature";

const sendSuggestion = vi.fn(async () => {});
vi.mock("@/sync/admin", () => ({ sendSuggestion: (...a: unknown[]) => sendSuggestion(...(a as [])) }));

const renderRow = () => render(<I18nProvider><SuggestFeature className="" /><Toaster /></I18nProvider>);

beforeEach(() => {
  localStorage.setItem("mm.language", "en");
  sendSuggestion.mockClear();
});
afterEach(() => {
  cleanup();
  setStatus({ state: "signed_out" });
});

describe("suggest a feature", () => {
  it("asks a signed-out user to sign in, with no form", async () => {
    setStatus({ state: "signed_out" });
    renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "Suggest a feature" }));
    expect(await screen.findByText(/Sign in with Google/)).toBeTruthy();
    expect(screen.queryByLabelText("Title")).toBeNull();
  });

  it("sends a signed-in user's suggestion", async () => {
    setStatus({ state: "up_to_date" });
    renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "Suggest a feature" }));
    const send = await screen.findByRole("button", { name: "Send" });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "ab" } });
    expect(send).toHaveProperty("disabled", true); // under 3 letters
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "  Loan tracker " } });
    fireEvent.change(screen.getByLabelText("Details (optional)"), { target: { value: "Who owes me" } });
    fireEvent.click(send);
    await waitFor(() => expect(sendSuggestion).toHaveBeenCalledWith("  Loan tracker ", "Who owes me")); // trimmed in sendSuggestion
    await waitFor(() => expect(screen.queryByRole("button", { name: "Send" })).toBeNull());
  });
});
