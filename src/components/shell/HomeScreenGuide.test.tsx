// Add-to-home-screen guide (user, 2026-11-15): pick the phone, then one step per screen with Back / Next / Done.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/provider";
import { HomeScreenGuide } from "./HomeScreenGuide";

beforeEach(() => localStorage.setItem("mm.language", "en"));
afterEach(cleanup);

const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));

describe("HomeScreenGuide", () => {
  it("walks the iPhone steps and back to the phone picker", async () => {
    render(
      <I18nProvider>
        <ul><HomeScreenGuide className="" /></ul>
      </I18nProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Add to home screen" }));
    // a desktop browser: Android is pre-selected
    expect(screen.getByRole("button", { name: "Android" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "iPhone" }));

    next();
    expect(screen.getByText("Tap the Share button")).toBeTruthy();
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    next();
    expect(screen.getByText("Tap “Add to Home Screen”")).toBeTruthy();
    next();
    expect(screen.getByText("Step 3 of 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();

    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Which phone do you use?", { selector: "p" })).toBeTruthy();
  });
});
