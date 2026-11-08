import { describe, expect, it } from "vitest";
import { move, sortOrderChanges } from "./order";

describe("move", () => {
  it("swaps with the neighbour and ignores moves past either end", () => {
    expect(move(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(move(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
    expect(move(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
  });
});

describe("sortOrderChanges", () => {
  it("renumbers 0..n and returns only rows that changed", () => {
    const rows = [{ id: "b", sort_order: 1 }, { id: "a", sort_order: 0 }, { id: "c", sort_order: 2 }];
    expect(sortOrderChanges(rows)).toEqual([{ id: "b", sort_order: 0 }, { id: "a", sort_order: 1 }]);
  });
  it("fixes duplicate sort_order values", () => {
    expect(sortOrderChanges([{ id: "a", sort_order: 0 }, { id: "b", sort_order: 0 }])).toEqual([{ id: "b", sort_order: 1 }]);
  });
});
