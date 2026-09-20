import { describe, expect, test } from "bun:test";
import { evictStaleIfFull } from "./boundedMap";

describe("evictStaleIfFull", () => {
  test("does nothing while the map is under maxSize", () => {
    const map = new Map([["a", 1]]);
    evictStaleIfFull(map, 5, () => true);
    expect(map.size).toBe(1);
  });

  test("removes only stale entries once the map is at or over maxSize", () => {
    const map = new Map([
      ["stale", "old"],
      ["fresh", "new"],
    ]);
    evictStaleIfFull(map, 2, (value) => value === "old");
    expect(map.has("stale")).toBe(false);
    expect(map.has("fresh")).toBe(true);
  });

  test("leaves every entry when none are stale", () => {
    const map = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    evictStaleIfFull(map, 2, () => false);
    expect(map.size).toBe(2);
  });
});
