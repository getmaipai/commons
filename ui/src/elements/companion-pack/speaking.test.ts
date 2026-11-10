import { afterEach, describe, expect, test } from "bun:test";
import { deflateSync, inflateSync } from "node:zlib";
import { setSurfaceFactory } from "./canvas-util";
import { FADE_SECONDS, SpeechCompositor, trackGate } from "./compositor";
import type { Cue } from "./cues";
import { chooseEmotion, emotionLevel, newEmotionWeights, stepEmotionWeights } from "./emotion";
import golden from "./fixtures/golden-fast-lines.json";
import { IDENTITY, regionBlock, warpRegion } from "./geometry";
import { activePoses, headDisplace } from "./head";
import { pickLid } from "./lids";
import { blinkAt, createLifeRuntime, eventShape, shiftRows } from "./life-runtime";
import { harmonize, newMouthState, sampleOffsets, slotWeights, tilePixels } from "./mouth";
import { loadPackLayers, setPackIO, tileStat } from "./pack-loader";
import { profileFor } from "./profile";
import { buildSegments, mouthAt, segmentShape } from "./speech";

const morph = { base: 8, ts: [0.2, 0.4, 0.6, 0.8] };
const ctxOf = (draws: string[]) => new Proxy({ canvas: { width: 480, height: 480 } }, {
  get: (t, k) => (k in t ? (t as Record<string | symbol, unknown>)[k] : () => { draws.push(String(k)); return { data: new Uint8ClampedArray(4) }; }),
}) as unknown as CanvasRenderingContext2D;

describe("shape selection from cues and the clock", () => {
  test("golden cues give the expected letter mid-vowel", () => {
    const line = golden[2]!;
    const segs = buildSegments(line.cues as Cue[], new Float32Array(line.env.length), { drop: false, loose: true, route: false });
    for (const cue of line.cues.filter((c) => "CDEF".includes(c.l) && c.t1 - c.t0 > 0.2)) {
      expect(segmentShape(segs, (cue.t0 + cue.t1) / 2, morph, false).slot, `${cue.p} at ${cue.t0}`).toBeGreaterThan(0);
    }
    const closed = line.cues.find((c) => c.p === "M")!;
    expect(segmentShape(segs, (closed.t0 + closed.t1) / 2, morph, false).l).toBe("A");
    const d = line.cues.find((c) => c.l === "D")!;
    expect(["C", "D"]).toContain(segmentShape(segs, (d.t0 + d.t1) / 2, morph, false).l);
  });
  test("a boundary draws a baked in-between slot", () => {
    const segs = [{ s: 0, t0: 0, t1: 0.5, w: 0 }, { s: 3, t0: 0.5, t1: 1, w: 0.12 }];
    const sel = segmentShape(segs, 0.5, morph, false);
    expect(sel.between).toBe(true);
    expect(sel.slot).toBeGreaterThanOrEqual(8);
    expect(segmentShape(segs, 0.9, morph, false).slot).toBe(3);
  });
  test("loud promotion opens shapes and the man's folding keeps G/H out", () => {
    const cues: Cue[] = [{ l: "A", t0: 0, t1: 0.2, p: "_" }, { l: "B", t0: 0.2, t1: 0.8, p: "IH" }, { l: "G", t0: 0.8, t1: 1.3, p: "F" }];
    const loud = new Float32Array(150).fill(1);
    expect(buildSegments(cues, loud, { drop: false, loose: false, route: false }).map((s) => s.s)).toContain(3);
    const calm = buildSegments(cues, new Float32Array(150), { drop: true, loose: false, route: false });
    expect(calm.some((s) => s.s === 6 || s.s === 7)).toBe(false);
  });
  test("slot weights of a baked in-between", () => {
    expect(slotWeights(0, 8, morph.ts)).toEqual([]);
    expect(slotWeights(3, 8, morph.ts)).toEqual([[3, 1]]);
    expect(slotWeights(8 + (0 * 8 + 3) * 4 + 1, 8, morph.ts)).toEqual([[3, 0.4]]);
  });
  test("vocal events override the cue shape", () => {
    const profile = profileFor("man"); const segs = [{ s: 0, t0: 0, t1: 5, w: 0 }];
    expect(mouthAt(segs, [], 0.5, morph, profile).slot).toBe(0);
    const ev = [{ type: "gasp", t0: 1, t1: 1.5, tagIdx: 0, src: "text", te: 1 }];
    expect(mouthAt(segs, ev as never, 1.2, morph, profile).slot).toBeGreaterThan(0);
  });
});

describe("flow warp, colour match, lids, tiles", () => {
  test("a known flow moves a known pixel", () => {
    const W = 20; const H = 20; const src = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) src[i * 4 + 3] = 255;
    const at = (x: number, y: number) => (y * W + x) * 4;
    src[at(10, 10)] = 200;
    const out = warpRegion({
      src, block: { bx0: 0, by0: 0, BW: W, BH: H }, k: 1, m: [1, 0, 224, 0, 1, 0], region: [0, 0, W, H], weight: null, margin: 1,
      displace(_rx, _ry, _w, d) { d[0] = -3; },
    });
    expect(out[at(13, 10)]!).toBeGreaterThan(190);
    expect(out[at(10, 10)]!).toBeLessThan(10);
  });
  test("zero flow leaves pixels untouched", () => {
    const src = Uint8ClampedArray.from({ length: 16 * 16 * 4 }, (_, i) => (i % 4 === 3 ? 255 : i % 251));
    const out = warpRegion({
      src, block: { bx0: 0, by0: 0, BW: 16, BH: 16 }, k: 1, m: [1, 0, 224, 0, 1, 0], region: [0, 0, 16, 16], weight: null, margin: 0, displace() {},
    });
    expect(Array.from(out)).toEqual(Array.from(src));
  });
  test("head displacement scales by weight and flowScale", () => {
    const flow = new Int16Array(2 * 2 * 3 * 2).fill(64);
    const head = { region: [0, 0, 6, 4], flowHalf: [3, 2], flowScale: 64, poses: ["nod", "brow"], weight: new Float32Array(24).fill(1), flow } as never;
    const act = activePoses(head, { nod: 0.5, brow: 0 });
    expect(act).toEqual([[0, 0.5]]);
    const d = new Float64Array(2); headDisplace(head, act)(1, 1, 0.5, d);
    expect(d[0]).toBeCloseTo(0.25, 5);
  });
  test("colour offsets, gain easing and tile copy", () => {
    const live = new Uint8ClampedArray(10 * 10 * 4).fill(130); const ref = new Uint8ClampedArray(10 * 10 * 4).fill(100);
    for (let i = 3; i < live.length; i += 4) { live[i] = 255; ref[i] = 255; }
    const list: number[] = []; for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) list.push(x, y);
    const off = sampleOffsets(live, 10, 10, list, ref, 10, (x, y) => [x - 0.5, y - 0.5], 15, false)!;
    expect(off.off[0]).toBeCloseTo(30, 5);
    expect(sampleOffsets(live, 10, 10, [1, 1], ref, 10, (x, y) => [x, y], 15, false)).toBeNull();
    const state = newMouthState(); const h = harmonize(state, [10, 10, 10], [10, 10, 10], 1);
    harmonize(state, [20, 20, 20], [20, 20, 20], 1.1);
    expect(h.ring[0]).toBeCloseTo(15, 5); expect(h.gain).toBeCloseTo(1.05, 5);
    const atlas = { w: 4, data: Uint8ClampedArray.from({ length: 4 * 2 * 4 }, (_, i) => i) };
    expect(Array.from(tilePixels(atlas, 2, 2, 1, 1, new Uint8ClampedArray(8)))).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(tileStat(new Uint8ClampedArray([10, 20, 30, 255]), 1, [0, 0]).mean).toEqual([10, 20, 30]);
  });
  test("lid pick is a hard pick and blinks close then open", () => {
    expect(pickLid(null)).toBeNull(); expect(pickLid({ half: 0.2, closed: 0 })).toBeNull();
    expect(pickLid({ half: 0.4, closed: 0 })).toBe("half"); expect(pickLid({ half: 0, closed: 0.7 })).toBe("closed");
    const blinks = [{ t0: 1, duration: 0.3, down: 0.12, amp: 1 }];
    expect(blinkAt(blinks, 1.12)).toBeCloseTo(1, 5); expect(blinkAt(blinks, 0.9)).toBe(0); expect(blinkAt(blinks, 1.3)).toBeLessThan(0.05);
  });
  test("shoulder rows shift up and the sides stay put", () => {
    const W = 200; const Hh = 20; const src = new Uint8ClampedArray(W * Hh * 4);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) src[(y * W + x) * 4] = y * 10;
    const out = new Uint8ClampedArray(src.length); shiftRows(src, out, W, Hh, 0, 5, 2, 20);
    expect(out[(10 * W + 100) * 4]).toBeCloseTo(120, 0); expect(out[(10 * W)  * 4]).toBe(100);
  });
});

describe("emotion and life", () => {
  test("weights ramp smoothly and never sum above 1", () => {
    const w = newEmotionWeights(); let prev = 0;
    for (let i = 0; i < 60; i++) {
      const s = stepEmotionWeights(w, "angry", 1); expect(s).toBeLessThanOrEqual(1.0001); expect(s - prev).toBeLessThan(0.17); prev = s;
    }
    expect(w.angry).toBeGreaterThan(0.95);
    for (let i = 0; i < 40; i++) expect(stepEmotionWeights(w, "sad", 1)).toBeLessThanOrEqual(1.0001);
    expect(w.angry).toBe(0); expect(w.sad).toBeGreaterThan(0.5);
  });
  test("emotion choice: forced level, words, shout fallback, off", () => {
    expect(chooseEmotion({ emotion: "sad" })).toEqual({ kind: "sad", forced: true, found: false });
    expect(chooseEmotion({ emotion: null }).kind).toBeNull();
    expect(chooseEmotion({ text: "Stop that now" })).toEqual({ kind: "angry", forced: false, found: true });
    expect(chooseEmotion({ text: "hello", voiceMode: "shout" }).kind).toBe("excited");
    expect(emotionLevel("angry", true, false, 0)).toBe(0.7); expect(emotionLevel(null, true, false, 1)).toBe(0);
  });
  test("head event shapes and a blink closes the lid on the golden line", () => {
    expect(eventShape({ channel: "nod", t0: 0, duration: 1.05, amp: 1 })).toEqual([0.5, 0.5]);
    const line = golden[2]!;
    const life = createLifeRuntime({ cues: line.cues as Cue[], loudness: new Float32Array(line.env.length), envelope: new Float32Array(line.env), events: [],
      seed: 3, packId: "man", poses: ["nod", "tilt", "brow", "eyeClosed", "eyeHalf", "eyeSquint", "eyeWide"], life: {}, cadence: 0 });
    const s = life.sample(0.9, { emoSum: 0 });
    expect(s.lid?.closed ?? 0).toBeGreaterThan(0.6); expect(s.fx.eyeClosed).toBe(0);
    expect(life.sample(-1, { emoSum: 0 }).lid).toBeNull();
  });
});

describe("loader and compositor", () => {
  let restore: (() => void) | undefined;
  afterEach(() => restore?.());
  test("loads the layout through the inflate fallback path", async () => {
    const meta = { region: [0, 0, 4, 4], flowHalf: [2, 2], flowScale: 64, poses: ["nod"] };
    const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
    const files: Record<string, Uint8Array> = {
      "head/meta.json": enc(meta), "head/flow.bin.z": deflateSync(Buffer.from(new Int16Array(8).buffer)),
      "clips/a.track.json": enc({ m: [[1, 0, 0, 0, 1, 0]], res: [0] }),
    };
    restore = setPackIO({
      bytes: async (url) => { const f = files[url.replace("http://localhost/p/", "")]; if (!f) throw new Error("404"); return f; },
      raster: async () => ({ w: 4, h: 4, data: new Uint8ClampedArray(64).fill(255) }), inflate: async (d) => new Uint8Array(inflateSync(d)),
    });
    const clip = { id: "a", file: "clips/a.mp4", fps: 24, frames: 1, rest: { first: 0, last: 0 } };
    const warnings: string[] = [];
    const data = { states: { idle: [clip], listen: [], think: [], speak: [] }, rest: "r.webp", head: { dir: "head" }, eyes: { dir: "eyes" } };
    const pack = await loadPackLayers(data, "/p/", (m) => warnings.push(m));
    expect(pack.head?.poses).toEqual(["nod"]); expect(pack.head?.flow.length).toBe(8);
    expect(pack.tracks.a?.m.length).toBe(1); expect(pack.eyes).toBeUndefined(); expect(warnings.length).toBe(2);
  });
  test("a pack without head and eyes fetches no head or eyes file and keeps the other layers", async () => {
    const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
    const files: Record<string, Uint8Array> = {
      "emotion/meta.json": enc({ region: [0, 0, 4, 4], kinds: { sad: {} } }),
      "emotion/sad.flow.bin.z": deflateSync(Buffer.from(new Int16Array(8).buffer)),
      "clips/a.track.json": enc({ m: [[1, 0, 0, 0, 1, 0]], res: [0] }),
    };
    const asked: string[] = [];
    restore = setPackIO({
      bytes: async (url) => { asked.push(url); const f = files[url.replace("http://localhost/p/", "")]; if (!f) throw new Error("404"); return f; },
      raster: async (url) => { asked.push(url); return { w: 4, h: 4, data: new Uint8ClampedArray(64).fill(255) }; }, inflate: async (d) => new Uint8Array(inflateSync(d)),
    });
    const clip = { id: "a", file: "clips/a.mp4", fps: 24, frames: 1, rest: { first: 0, last: 0 } };
    const warnings: string[] = [];
    const data = { states: { idle: [clip], listen: [], think: [], speak: [] }, rest: "r.webp", emotion: { dir: "emotion", kinds: ["sad"] } };
    const pack = await loadPackLayers(data, "/p/", (m) => warnings.push(m));
    expect(asked.some((url) => /\/(head|eyes)\//.test(url))).toBe(false);
    expect(pack.head).toBeUndefined(); expect(pack.eyes).toBeUndefined();
    expect(pack.emotion?.kinds.sad?.flow.length).toBe(8); expect(pack.tracks.a?.m.length).toBe(1);
    expect(warnings.filter((m) => /head|eyes/.test(m))).toEqual([]);
  });
  test("speaking runs with only mouth and emotion layers: no lids, no head draw", () => {
    restore = setSurfaceFactory(() => { throw new Error("no surface expected"); });
    const draws: string[] = []; const ctx = ctxOf(draws);
    const comp = new SpeechCompositor({ id: "man", tracks: {}, life: {}, emotion: { region: [0, 0, 4, 4], kinds: {} }, loadShout: async () => undefined }, undefined, () => 0);
    comp.setSpeech({ cues: [], loudness: new Float32Array(10), events: [], clock: () => 0.1 });
    for (const now of [16, 32, 48]) expect(() => comp.draw(ctx, { clipId: "x", frameIndex: 0, now })).not.toThrow();
    expect(comp.active).toBe(true);
    expect(draws).toEqual([]);
  });
  test("no speech means no work; fade out finishes inside 90 ms", () => {
    restore = setSurfaceFactory(() => { throw new Error("no surface expected"); });
    const draws: string[] = []; const ctx = ctxOf(draws);
    const comp = new SpeechCompositor({ id: "man", tracks: {}, life: {}, loadShout: async () => undefined }, undefined, () => 0);
    expect(comp.draw(ctx, { clipId: "x", frameIndex: 0, now: 0 })).toBe(false);
    expect(draws).toEqual([]); expect(comp.active).toBe(false);
    comp.setSpeech({ cues: [], loudness: new Float32Array(10), events: [], clock: () => 0.1 });
    comp.draw(ctx, { clipId: "x", frameIndex: 0, now: 16 }); comp.draw(ctx, { clipId: "x", frameIndex: 0, now: 32 });
    expect(comp.active).toBe(true);
    comp.setSpeech(undefined);
    for (const now of [48, 64, 80, 96]) comp.draw(ctx, { clipId: "x", frameIndex: 0, now });
    expect(FADE_SECONDS).toBeLessThan(0.09); expect(comp.active).toBe(false);
  });
  test("track gate fades layers where the head track fits poorly", () => {
    expect(trackGate(undefined)).toBe(1); expect(trackGate(5)).toBe(1); expect(trackGate(11.5)).toBeCloseTo(0.5, 5); expect(trackGate(21)).toBe(0);
  });
  test("region block of an identity track", () => {
    expect(regionBlock(IDENTITY, [224, 0, 100, 100], 1, 480, 480, 0)).toEqual({ bx0: 0, by0: 0, BW: 100, BH: 100 });
  });
});
