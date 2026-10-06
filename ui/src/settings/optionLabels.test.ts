import { describe, expect, test } from "bun:test";
import { middleEllipsis } from "@/kit/settings/optionLabels";

describe("middleEllipsis", () => {
  test("leaves a short value alone", () => {
    expect(middleEllipsis("/srv/library")).toBe("/srv/library");
  });

  test("cuts the middle and keeps both ends, within the limit", () => {
    const value = "/Users/example/Documents/very/long/folder/name/Codex";
    const out = middleEllipsis(value, 24);
    expect(out.length).toBe(24);
    expect(out.startsWith("/Users/exam")).toBe(true);
    expect(out.endsWith("name/Codex")).toBe(true);
    expect(out).toContain("…");
  });
});
