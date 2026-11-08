import { describe, expect, it } from "vitest";
import { neighbourTab, swipeTarget } from "./swipe";

const W = 360; // screen width

describe("swipeTarget", () => {
  it("left goes to the next tab, right to the previous", () => {
    expect(swipeTarget("/", -150, 5, 500, W)).toBe("/transactions/");
    expect(swipeTarget("/transactions/", -150, 5, 500, W)).toBe("/budgets/");
    expect(swipeTarget("/budgets", 150, 5, 500, W)).toBe("/transactions/"); // with or without the trailing slash
  });

  it("goes on a long drag of any speed, or a quick flick", () => {
    expect(swipeTarget("/", -130, 0, 2000, W)).toBe("/transactions/"); // over a third of the screen, slowly
    expect(swipeTarget("/", -70, 0, 200, W)).toBe("/transactions/"); // short but quick
  });

  it("springs back on a short slow drag, a tiny flick, or a mostly vertical move", () => {
    expect(swipeTarget("/", -100, 0, 800, W)).toBeNull();
    expect(swipeTarget("/", -40, 0, 100, W)).toBeNull();
    expect(swipeTarget("/", -150, 120, 200, W)).toBeNull(); // a scroll
  });

  it("stops at the ends and off the tabs", () => {
    expect(swipeTarget("/", 150, 0, 200, W)).toBeNull();
    expect(swipeTarget("/more/", -150, 0, 200, W)).toBeNull();
    expect(swipeTarget("/wallets/", -150, 0, 200, W)).toBeNull();
  });
});

describe("neighbourTab", () => {
  it("knows when there is no tab to drag towards", () => {
    expect(neighbourTab("/", 1)).toBe("/transactions/");
    expect(neighbourTab("/", -1)).toBeNull();
    expect(neighbourTab("/add/", 1)).toBeNull();
  });
});
