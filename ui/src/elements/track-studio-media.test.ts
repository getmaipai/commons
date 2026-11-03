import { describe, expect, test } from "bun:test";
import { computePeaks, sliceBars } from "./track-studio-media";

describe("peaks", () => {
  test("the loudest sample of each slice, scaled so the loudest bar is 1", () => {
    const samples = new Float32Array([0, 0.1, -0.2, 0.05, 0, -0.4, 0.2, 0]);
    const p = computePeaks(samples, 4);
    // slices: [0, 0.1], [-0.2, 0.05], [0, -0.4], [0.2, 0] -> peaks 0.1, 0.2, 0.4, 0.2 -> over 0.4
    expect(p).toEqual([0.25, 0.5, 1, 0.5]);
  });
  test("a silent file stays flat and an empty one is all zeros", () => {
    expect(computePeaks(new Float32Array(100), 5)).toEqual([0, 0, 0, 0, 0]);
    expect(computePeaks(new Float32Array(0), 3)).toEqual([0, 0, 0]);
  });
  test("more bars than samples never invents a bar out of range", () => {
    const p = computePeaks(new Float32Array([0.5, 1]), 8);
    expect(p).toHaveLength(8);
    expect(Math.max(...p)).toBe(1);
  });
  test("a slice of the whole-source peaks for a trimmed piece, resampled to the bars it is drawn with", () => {
    const peaks = Array.from({ length: 100 }, (_, i) => i / 100); // 10 s at 10 bars a second, rising
    const s = sliceBars(peaks, 10, 5, 10, 5);
    expect(s).toHaveLength(5);
    expect(s[0]!).toBeGreaterThanOrEqual(0.5);
    expect(s[4]!).toBeGreaterThan(s[0]!);
    expect(sliceBars(peaks, 10, 0, 10, 0)).toEqual([]);
    expect(sliceBars([], 10, 0, 1, 3)).toEqual([0, 0, 0]);
  });
});
