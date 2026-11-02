import { describe, expect, test } from "bun:test";
import { dateMs, dayHeading, dayKey } from "@/kit/relativeTime";
import { readField, writeField } from "@/kit/schema/fieldPath";

describe("day group helpers (VIDEO-UI-05)", () => {
  const now = new Date(2026, 10, 2, 15);
  test("dateMs reads ISO strings, epoch seconds and epoch milliseconds, and nothing else", () => {
    const ms = Date.UTC(2026, 10, 2, 12);
    expect(dateMs(new Date(ms).toISOString())).toBe(ms);
    expect(dateMs(ms / 1000)).toBe(ms);
    expect(dateMs(ms)).toBe(ms);
    for (const bad of [undefined, null, "", "soon", 0, -5, NaN, {}]) expect(dateMs(bad)).toBeUndefined();
  });
  test("dayKey is the local calendar day", () => {
    expect(dayKey(new Date(2026, 10, 2, 23, 59).toISOString())).toBe("2026-11-02");
    expect(dayKey("nope")).toBeUndefined();
  });
  test("dayHeading says Today, Yesterday, then a short date with the year only when it differs", () => {
    expect(dayHeading("2026-11-02", now)).toBe("Today");
    expect(dayHeading("2026-11-01", now)).toBe("Yesterday");
    expect(dayHeading("2026-10-27", now)).toBe("Tue, Oct 27");
    expect(dayHeading("2025-12-31", now)).toBe("Wed, Dec 31, 2025");
  });
  test("writeField sets a top-level or dotted path without touching the original", () => {
    const row = { id: "a", meta: { fav: false, keep: 1 } };
    expect(writeField(row, "id", "b")).toEqual({ id: "b", meta: { fav: false, keep: 1 } });
    const next = writeField(row, "meta.fav", true);
    expect(readField(next, "meta.fav")).toBe(true);
    expect(readField(next, "meta.keep")).toBe(1);
    expect(row.meta.fav).toBe(false);
  });
});
