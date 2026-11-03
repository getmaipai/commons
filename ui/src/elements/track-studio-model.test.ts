import { describe, expect, test } from "bun:test";
import {
  dbToGain, effectiveCrossfade, envelopePoints, filmLength, findPiece, formatTime, gainAt, gainToDb, laneGain, laneOf, layoutLane, mapPiece, normalizeCrossfade, pieceAt,
  pieceEnvelope, previewEnd, readState, rulerStep, rulerTicks, setDuck, setLaneLevel, setLaneMuted, setPieceLevel, spokenTime, type StudioPiece, type StudioState,
} from "./track-studio-model";

const piece = (id: string, o: Partial<StudioPiece> = {}): StudioPiece => ({ id, ref: id, src: `/f/${id}.mp4`, in_s: 0, out_s: 4, source_s: 10, at_s: 0, level_db: 0, fade_in_s: 0, fade_out_s: 0, crossfade_s: 0, duck: false, ...o });
const base = (): StudioState =>
  readState([
    { id: "video", pieces: [piece("a", { out_s: 4 }), piece("b", { out_s: 6, in_s: 1 }), piece("c", { out_s: 3 })] },
    { id: "voice", pieces: [piece("v", { src: "/f/v.wav", at_s: 2, out_s: 3 })] },
    { id: "music", pieces: [piece("m", { src: "/f/m.wav", at_s: 0, out_s: 9 })] },
  ]);
/** The crossfade at the seam after a piece lives on the next video piece (the page's data carries it that way). */
const withX = (s: StudioState, afterId: string, x: number): StudioState => {
  const pieces = laneOf(s, "video").pieces;
  const next = pieces[pieces.findIndex((p) => p.id === afterId) + 1]!;
  return mapPiece(s, next.id, (p) => ({ ...p, crossfade_s: x }));
};
const withFade = (s: StudioState, id: string, o: Partial<StudioPiece>): StudioState => mapPiece(s, id, (p) => ({ ...p, ...o }));

describe("readState", () => {
  test("always has three lanes and drops a piece with no source or an empty cut", () => {
    const s = readState([{ id: "video", pieces: [{ id: "x", src: "" }, { id: "y", src: "/a.mp4", in_s: 2, out_s: 2.1 }, { id: "z", src: "/a.mp4", out_s: 5 }] }, { id: "nope", pieces: [] }]);
    expect(s.lanes.map((l) => l.id)).toEqual(["video", "voice", "music"]);
    expect(laneOf(s, "video").pieces.map((p) => p.id)).toEqual(["z"]);
    expect(laneOf(s, "voice").pieces).toEqual([]);
  });
  test("the first video piece never has a crossfade, numbers are clamped to the source", () => {
    const s = readState([{ id: "video", pieces: [{ id: "a", src: "/a", out_s: 99, source_s: 10, crossfade_s: 0.5, level_db: 99, fade_in_s: 99 }] }]);
    const p = laneOf(s, "video").pieces[0]!;
    expect(p.crossfade_s).toBe(0);
    expect(p.out_s).toBe(10);
    expect(p.level_db).toBe(12);
    expect(p.fade_in_s).toBe(5);
  });
});

describe("layout, ripple and join order", () => {
  test("video pieces ripple end to end", () => {
    const l = layoutLane(laneOf(base(), "video"));
    expect(l.map((p) => [p.start, p.end])).toEqual([[0, 4], [4, 9], [9, 12]]);
    expect(filmLength(base())).toBe(12);
  });
  test("a crossfade overlaps the seam and shortens the film by its length", () => {
    let s = base();
    s = withX(s, "a", 0.5);
    const l = layoutLane(laneOf(s, "video"));
    expect(l.map((p) => [p.start, p.end])).toEqual([[0, 4], [3.5, 8.5], [8.5, 11.5]]);
    expect(filmLength(s)).toBe(11.5);
  });
  test("a crossfade is never longer than either piece", () => {
    const s = readState([{ id: "video", pieces: [piece("a", { out_s: 0.4 }), piece("b", { out_s: 5, crossfade_s: 1 })] }]);
    const [a, b] = laneOf(s, "video").pieces as [StudioPiece, StudioPiece];
    expect(effectiveCrossfade(a, b)).toBeCloseTo(0.35, 5);
  });
  test("the preview cuts at the start of the incoming piece", () => {
    const s = withX(base(), "a", 1);
    const lane = laneOf(s, "video");
    expect(previewEnd(lane, 0)).toBe(3);
    expect(pieceAt(lane, 3.4)!.piece.id).toBe("b");
    expect(pieceAt(lane, 2.9)!.piece.id).toBe("a");
    expect(pieceAt(lane, 99)).toBeNull();
  });
  test("audio pieces sit at their own start", () => {
    const l = layoutLane(laneOf(base(), "voice"));
    expect([l[0]!.start, l[0]!.end]).toEqual([2, 5]);
  });
  test("normalizeCrossfade is a cut or 0.3 to 1 second", () => {
    expect([0, 0.04, 0.1, 0.3, 0.55, 2, NaN].map(normalizeCrossfade)).toEqual([0, 0, 0.3, 0.3, 0.6, 1, 0]);
  });
});

describe("level and fade curves", () => {
  test("dB to gain", () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
    expect(dbToGain(6)).toBeCloseTo(1.995, 3);
    expect(gainToDb(dbToGain(-12))).toBeCloseTo(-12, 6);
  });
  test("a piece with no fades is flat at its level", () => {
    const pts = envelopePoints(piece("a", { out_s: 4, level_db: -6 }));
    expect(pts.map((p) => p.t)).toEqual([0, 4]);
    expect(gainAt(pts, 2)).toBeCloseTo(dbToGain(-6), 6);
  });
  test("fade in and out are linear ramps to the level", () => {
    const pts = envelopePoints(piece("a", { out_s: 10, fade_in_s: 2, fade_out_s: 4 }));
    expect(gainAt(pts, 0)).toBe(0);
    expect(gainAt(pts, 1)).toBeCloseTo(0.5, 6);
    expect(gainAt(pts, 2)).toBe(1);
    expect(gainAt(pts, 6)).toBe(1);
    expect(gainAt(pts, 8)).toBeCloseTo(0.5, 6);
    expect(gainAt(pts, 10)).toBe(0);
  });
  test("overlapping fades meet below the level, never above it", () => {
    const pts = envelopePoints(piece("a", { out_s: 4, fade_in_s: 3, fade_out_s: 3 }));
    for (let t = 0; t <= 4; t += 0.25) expect(gainAt(pts, t)).toBeLessThanOrEqual(1 + 1e-9);
    // the rising ramp t/3 and the falling ramp (4-t)/3 cross at t = 2, height 2/3
    expect(gainAt(pts, 2)).toBeCloseTo(2 / 3, 6);
    expect(gainAt(pts, 1)).toBeCloseTo(1 / 3, 6);
    expect(gainAt(pts, 3)).toBeCloseTo(1 / 3, 6);
  });
  test("a crossfade is a fade of the longer length at the seam, in the sound as well as the picture", () => {
    const s = withX(base(), "a", 0.8);
    const a = pieceEnvelope(laneOf(s, "video"), 0);
    const b = pieceEnvelope(laneOf(s, "video"), 1);
    expect(gainAt(a, 4)).toBe(0);
    expect(gainAt(a, 4 - 0.4)).toBeCloseTo(0.5, 6);
    expect(gainAt(a, 4 - 0.8)).toBe(1);
    expect(gainAt(b, 0)).toBe(0);
    expect(gainAt(b, 0.4)).toBeCloseTo(0.5, 6);
    // equal gain across the overlap: the two ramps add to one
    expect(gainAt(a, 4 - 0.2) + gainAt(b, 0.6)).toBeCloseTo(1, 6);
  });
  test("a piece's own longer fade beats the seam", () => {
    const s = withFade(withX(base(), "a", 0.5), "b", { fade_in_s: 2 });
    expect(gainAt(pieceEnvelope(laneOf(s, "video"), 1), 1)).toBeCloseTo(0.5, 6);
  });
  test("lane gain: level, mute and solo", () => {
    let s = setLaneLevel(base(), "voice", -6);
    expect(laneGain(laneOf(s, "voice"), null)).toBeCloseTo(0.501, 3);
    expect(laneGain(laneOf(s, "voice"), "music")).toBe(0);
    expect(laneGain(laneOf(s, "music"), "music")).toBe(1);
    s = setLaneMuted(s, "voice", true);
    expect(laneGain(laneOf(s, "voice"), null)).toBe(0);
    expect(laneGain(laneOf(s, "voice"), "voice")).toBe(0);
  });
  test("piece level and duck are clamped and set", () => {
    const s = setPieceLevel(base(), "a", -99);
    expect(findPiece(s, "a")!.piece.level_db).toBe(-24);
    expect(findPiece(setDuck(s, "m", true), "m")!.piece.duck).toBe(true);
  });
});

describe("time words and the ruler", () => {
  test("times", () => {
    expect([0, 5.9, 6, 65].map(formatTime)).toEqual(["0:00", "0:05", "0:06", "1:05"]);
    expect([1, 6, 60, 65].map(spokenTime)).toEqual(["1 second", "6 seconds", "1 minute", "1 minute 5 seconds"]);
  });
  test("ruler step grows as the scale shrinks and ticks cover the length", () => {
    expect(rulerStep(60)).toBe(1);
    expect(rulerStep(30)).toBe(2);
    expect(rulerStep(8)).toBe(10);
    expect(rulerTicks(10, 30)).toEqual([0, 2, 4, 6, 8, 10]);
  });
});
