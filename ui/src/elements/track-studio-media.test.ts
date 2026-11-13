import { afterEach, describe, expect, mock, test } from "bun:test";
import { PEAKS_DECODE_RATE, computePeaks, decodePeaks, fetchGivenPeaks, readGivenPeaks, sliceBars } from "./track-studio-media";

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

describe("decodePeaks", () => {
  const realFetch = globalThis.fetch;
  const realOffline = (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext;
  afterEach(() => { globalThis.fetch = realFetch; (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext = realOffline; });
  const stub = (decode: (bytes: ArrayBuffer) => unknown) => {
    const made: number[][] = [];
    class Fake { constructor(...a: number[]) { made.push(a); } decodeAudioData(bytes: ArrayBuffer, ok?: (b: unknown) => void, bad?: (e: unknown) => void) { try { const b = decode(bytes); ok?.(b); return Promise.resolve(b); } catch (e) { bad?.(e); return Promise.reject(e); } } }
    (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext = Fake;
    globalThis.fetch = mock(async () => new Response(new Uint8Array(8))) as unknown as typeof fetch;
    return made;
  };
  test("decodes at a low rate, one channel context, and folds a stereo song to bars", async () => {
    const made = stub(() => ({ duration: 2, length: 4, numberOfChannels: 2, getChannelData: (c: number) => (c === 0 ? new Float32Array([0, 0.5, 0, 0]) : new Float32Array([0, 0, -1, 0])) }));
    const got = await decodePeaks("/f/song.m4a", new AbortController().signal);
    expect(made[0]).toEqual([1, PEAKS_DECODE_RATE, PEAKS_DECODE_RATE]);
    expect(got.duration).toBe(2);
    expect(Math.max(...got.peaks)).toBe(1);
  });
  test("a decode that fails rejects, so the lane draws its plain bar", async () => {
    stub(() => { throw new Error("EncodingError"); });
    await expect(decodePeaks("/f/song.m4a", new AbortController().signal)).rejects.toThrow();
  });
});

describe("the host's own peaks", () => {
  test("a plain array or { peaks, duration } is read, clamped to 0..1; fewer than two values is not peaks", () => {
    expect(readGivenPeaks([0, 2, -1, 0.5], 10)).toEqual({ peaks: [0, 1, 0, 0.5], duration: 10 });
    expect(readGivenPeaks({ peaks: [0.1, 0.2], duration: 3 }, 10)).toEqual({ peaks: [0.1, 0.2], duration: 3 });
    expect(readGivenPeaks([0.5], 10)).toBeNull();
    expect(readGivenPeaks("x", 10)).toBeNull();
    expect(readGivenPeaks([0.1, 0.2], 0)).toBeNull();
  });
  test("fetchGivenPeaks rejects on a bad status so the caller can decode instead", async () => {
    const real = globalThis.fetch;
    globalThis.fetch = mock(async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
    await expect(fetchGivenPeaks("/x.json", 5, new AbortController().signal)).rejects.toThrow();
    globalThis.fetch = real;
  });
});
