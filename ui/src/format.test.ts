import { describe, expect, test } from "bun:test";
import { formatBytes } from "./format";

describe("formatBytes", () => {
  test("promotes to the next unit when rounding reaches 1024", () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe("1 MB");
    expect(formatBytes(1024 ** 3 - 1)).toBe("1 GB");
    expect(formatBytes(1024 ** 2 - 10)).toBe("1 MB");
  });

  test("keeps the unit below the rounding edge", () => {
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024 * 1023)).toBe("1023 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  test("stops at the largest unit", () => {
    expect(formatBytes(1024 ** 5 * 2000)).toBe("2000 PB");
  });
});
