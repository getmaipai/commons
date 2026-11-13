// MP-03: the audio studio's EQ, compressor and range selection model.
import { describe, expect, test } from "bun:test";
import {
  COMPRESSOR_LIMITS, EQ_BANDS_HZ, bandText, compressorIsNeutral, defaultEffects, effectsAreNeutral, makeSelection, readEffects, readSelection, resetCompressor, resetEq, setCompressor, setEqBand,
} from "./track-studio-fx";
import { STEM_LANE_IDS, audioLaneIds, filmLength, laneOf, readState } from "./track-studio-model";
import { toPlan } from "./track-studio-edit";

describe("the EQ", () => {
  test("six bands at 60, 170, 500, 1500, 5000 and 12000 Hz, flat by default", () => {
    expect([...EQ_BANDS_HZ]).toEqual([60, 170, 500, 1500, 5000, 12000]);
    expect(defaultEffects().eq).toEqual([0, 0, 0, 0, 0, 0]);
    expect(effectsAreNeutral(defaultEffects())).toBe(true);
    expect(bandText(1500)).toBe("1.5 kHz");
    expect(bandText(60)).toBe("60 Hz");
  });
  test("a band gain is clamped to -12..12 dB and rounded to half a dB", () => {
    const fx = defaultEffects();
    expect(setEqBand(fx, 0, 40).eq[0]).toBe(12);
    expect(setEqBand(fx, 5, -40).eq[5]).toBe(-12);
    expect(setEqBand(fx, 2, 3.3).eq[2]).toBe(3.5);
    expect(setEqBand(fx, 9, 3)).toBe(fx);
    expect(effectsAreNeutral(setEqBand(fx, 2, 3))).toBe(false);
  });
  test("reset puts every band back to 0 and leaves the compressor alone", () => {
    const fx = setCompressor(setEqBand(defaultEffects(), 1, 6), { ratio: 4 });
    const r = resetEq(fx);
    expect(r.eq).toEqual([0, 0, 0, 0, 0, 0]);
    expect(r.compressor.ratio).toBe(4);
  });
});

describe("the compressor", () => {
  test("neutral is ratio 1 with no make-up; every field is clamped", () => {
    expect(compressorIsNeutral(defaultEffects().compressor)).toBe(true);
    const fx = setCompressor(defaultEffects(), { threshold_db: -90, ratio: 99, attack_ms: 0, release_ms: 5000, makeup_db: 99 });
    const c = fx.compressor;
    expect(c.threshold_db).toBe(COMPRESSOR_LIMITS.threshold_db.min);
    expect(c.ratio).toBe(COMPRESSOR_LIMITS.ratio.max);
    expect(c.attack_ms).toBe(COMPRESSOR_LIMITS.attack_ms.min);
    expect(c.release_ms).toBe(COMPRESSOR_LIMITS.release_ms.max);
    expect(c.makeup_db).toBe(COMPRESSOR_LIMITS.makeup_db.max);
    expect(compressorIsNeutral(c)).toBe(false);
  });
  test("reset restores the defaults and leaves the EQ alone", () => {
    const fx = setEqBand(setCompressor(defaultEffects(), { ratio: 6, threshold_db: -30 }), 0, 4);
    const r = resetCompressor(fx);
    expect(r.compressor).toEqual(defaultEffects().compressor);
    expect(r.eq[0]).toBe(4);
  });
  test("readEffects takes a host value, drops junk and clamps", () => {
    expect(readEffects(null)).toEqual(defaultEffects());
    const fx = readEffects({ eq: [1, "x", 99], compressor: { ratio: "high", threshold_db: -20 } });
    expect(fx.eq).toEqual([1, 0, 12, 0, 0, 0]);
    expect(fx.compressor.ratio).toBe(1);
    expect(fx.compressor.threshold_db).toBe(-20);
  });
});

describe("the selection", () => {
  test("a range is ordered, clamped to the length and rounded; a sliver is no selection", () => {
    expect(makeSelection(8, 2, 10)).toEqual({ start_s: 2, end_s: 8 });
    expect(makeSelection(-3, 40, 10)).toEqual({ start_s: 0, end_s: 10 });
    expect(makeSelection(2, 2.01, 10)).toBeNull();
    expect(makeSelection(1, 2, 0)).toBeNull();
  });
  test("a host value is read back or dropped", () => {
    expect(readSelection({ start_s: 1, end_s: 3 }, 10)).toEqual({ start_s: 1, end_s: 3 });
    expect(readSelection({ start_s: 1, end_s: "x" }, 10)).toBeNull();
    expect(readSelection(undefined, 10)).toBeNull();
    expect(readSelection({ start_s: 11, end_s: 12 }, 10)).toBeNull();
  });
});

describe("stem lanes", () => {
  const raw = [
    { id: "stem-drums", pieces: [{ id: "d", ref: "d", src: "/f/d.wav", in_s: 0, out_s: 8, at_s: 0 }] },
    { id: "stem-vocals", level_db: -3, muted: true, pieces: [{ id: "v", ref: "v", src: "/f/v.wav", in_s: 0, out_s: 10, at_s: 0 }] },
    { id: "stem-banjo", pieces: [] },
  ];
  test("the host's stem lanes follow voice and music in stem order; an unknown stem is ignored; label and hue default per stem", () => {
    const s = readState(raw);
    expect(s.lanes.map((l) => l.id)).toEqual(["video", "voice", "music", "stem-vocals", "stem-drums"]);
    expect(audioLaneIds(s)).toEqual(["voice", "music", "stem-vocals", "stem-drums"]);
    expect(laneOf(s, "stem-vocals").label).toBe("Vocals");
    expect(laneOf(s, "stem-vocals").hue).toBe("pink");
    expect(laneOf(s, "stem-drums").hue).toBe("orange");
    expect(laneOf(s, "stem-vocals").level_db).toBe(-3);
    expect(laneOf(s, "stem-vocals").muted).toBe(true);
    expect([...STEM_LANE_IDS]).toEqual(["stem-vocals", "stem-drums", "stem-bass", "stem-other"]);
  });
  test("the studio is as long as its longest stem when there is no picture", () => {
    expect(filmLength(readState(raw))).toBe(10);
  });
  test("the plan lists stems only when there are some, so a video plan is unchanged", () => {
    expect(toPlan(readState([])).stems).toBeUndefined();
    const plan = toPlan(readState(raw));
    expect(plan.stems?.map((s) => s.id)).toEqual(["stem-vocals", "stem-drums"]);
    expect(plan.stems?.[0]).toMatchObject({ level_db: -3, muted: true });
    expect(plan.stems?.[0]?.pieces[0]).toMatchObject({ ref: "v", start_s: 0 });
  });
});
