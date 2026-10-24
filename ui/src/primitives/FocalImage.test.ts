import { describe, expect, test } from "bun:test";
import { focalObjectPosition, restoreFocalMap } from "./FocalImage";

describe("FocalImage crop math", () => {
  test("keeps a salient region near the left or right edge inside a square crop", () => {
    const left = new Float32Array(64 * 64);
    left[32 * 64 + 5] = 1;
    const right = new Float32Array(64 * 64);
    right[32 * 64 + 58] = 1;
    const leftX = Number(focalObjectPosition(left, 200, 100, 1).split(" ")[0]!.replace("%", ""));
    const rightX = Number(focalObjectPosition(right, 200, 100, 1).split(" ")[0]!.replace("%", ""));
    expect(leftX).toBeLessThan(50);
    expect(rightX).toBeGreaterThan(50);
  });

  test("removes model-input letterbox before mapping a portrait image", () => {
    const map = new Float32Array(64 * 64);
    map.fill(1);
    const restored = restoreFocalMap(map, 100, 200);
    expect(restored).toHaveLength(64 * 64);
    expect(restored[0]).toBeCloseTo(1);
    expect(restored[32 * 64 + 32]).toBeCloseTo(1);
  });

  test("falls back to centered framing for an empty map", () => {
    expect(focalObjectPosition(new Float32Array(64 * 64), 200, 100, 1)).toBe("50% 50%");
  });
});
