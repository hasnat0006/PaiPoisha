// Running totals on the admin chart start from what existed before the range.
import { describe, expect, it } from "vitest";
import type { AdminStats } from "@/sync/admin";
import { chartValues } from "./DailyChart";

const day = (sign_ups: number, entries: number, active = 5) => ({ day: "2026-11-01", sign_ups, sign_ins: 1, active, entries });
const stats = { users: 10, entries: 100, daily: [day(1, 10), day(0, 5), day(2, 15)] } as AdminStats;

describe("chartValues", () => {
  it("daily is the plain counts", () => expect(chartValues(stats, "sign_ups", "daily")).toEqual([1, 0, 2]));
  it("cumulative sign-ups end at the user count", () => expect(chartValues(stats, "sign_ups", "total")).toEqual([8, 8, 10]));
  it("cumulative entries end at the entry count", () => expect(chartValues(stats, "entries", "total")).toEqual([80, 85, 100]));
  it("cumulative sign-ins start at 0", () => expect(chartValues(stats, "sign_ins", "total")).toEqual([1, 2, 3]));
  it("active users never add up", () => expect(chartValues(stats, "active", "total")).toEqual([5, 5, 5]));
});
