import { describe, expect, it } from "vitest";
import { getPeriod, inPeriod, periodFromKey, shiftPeriod } from "./period";

describe("getPeriod", () => {
  it("start day 1: the calendar month in Dhaka time", () => {
    expect(getPeriod("2026-11-07T10:00:00+06:00", 1)).toEqual({
      key: "2026-11",
      start: "2026-10-31T18:00:00.000Z", // 1 Nov 00:00 Dhaka
      end: "2026-11-30T18:00:00.000Z", // 1 Dec 00:00 Dhaka
    });
  });

  it("start day 7: crossing a month boundary", () => {
    expect(getPeriod("2026-11-07T00:00:00+06:00", 7).key).toBe("2026-11");
    expect(getPeriod("2026-11-06T23:59:59+06:00", 7).key).toBe("2026-10");
    expect(getPeriod("2026-12-06T23:59:59+06:00", 7).key).toBe("2026-11");
  });

  it("start day 7: crossing a year (December → January)", () => {
    expect(getPeriod("2027-01-03T10:00:00+06:00", 7).key).toBe("2026-12");
    const dec = periodFromKey("2026-12", 7);
    expect(dec.end).toBe("2027-01-06T18:00:00.000Z"); // 7 Jan 2027 00:00 Dhaka
  });

  it("uses the Dhaka day, not UTC, near midnight", () => {
    expect(getPeriod("2026-11-30T18:30:00Z", 1).key).toBe("2026-12"); // 1 Dec 00:30 Dhaka
  });
});

describe("shiftPeriod / inPeriod", () => {
  it("moves across years both ways", () => {
    expect(shiftPeriod("2026-12", 1, 1).key).toBe("2027-01");
    expect(shiftPeriod("2026-01", -1, 1).key).toBe("2025-12");
  });

  it("includes the start and excludes the end", () => {
    const p = periodFromKey("2026-11", 7);
    expect(inPeriod("2026-11-07T00:00:00+06:00", p)).toBe(true);
    expect(inPeriod("2026-12-07T00:00:00+06:00", p)).toBe(false);
    expect(inPeriod("2026-12-06T23:59:59+06:00", p)).toBe(true);
  });
});
