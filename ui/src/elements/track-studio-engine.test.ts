import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { PreviewEngine, DRIFT_LIMIT_S, MAX_AUDIO_ELEMENTS } from "./track-studio-engine";
import { laneOf, mapPiece, readState, setLaneMuted, setPieceLevel, type StudioPiece, type StudioState } from "./track-studio-model";
import { FakeAudioContext, advance, clockOf, flush, installFakeMedia, setClock, type FakeGain } from "../../tests/fakeMedia";

const piece = (id: string, o: Partial<StudioPiece> = {}) => ({ id, ref: id, src: `/f/${id}.mp4`, in_s: 0, out_s: 4, source_s: 20, ...o });
/** The crossfade after a piece is stored on the next video piece. */
const setCrossfadeAfter = (s: StudioState, afterId: string, x: number): StudioState => {
  const pieces = laneOf(s, "video").pieces;
  return mapPiece(s, pieces[pieces.findIndex((p) => p.id === afterId) + 1]!.id, (p) => ({ ...p, crossfade_s: x }));
};
const plan = (video: object[], voice: object[] = [], music: object[] = []): StudioState => readState([{ id: "video", pieces: video }, { id: "voice", pieces: voice }, { id: "music", pieces: music }]);

let restore: () => void;
let host: HTMLDivElement;
let videoHost: HTMLDivElement;
let ctx: FakeAudioContext;
let t: number[];
let playing: boolean[];
let clockMs: number;
let errors: string[];
beforeEach(() => {
  document.body.replaceChildren(); // other test files leave elements behind; these tests count media elements in the whole document
  restore = installFakeMedia();
  host = document.createElement("div");
  videoHost = document.createElement("div");
  document.body.append(host, videoHost);
  ctx = new FakeAudioContext();
  t = []; playing = []; errors = []; clockMs = 0;
});
afterEach(() => { restore(); host.remove(); videoHost.remove(); });

const make = (state: StudioState, audio = true) =>
  new PreviewEngine(state, {
    videoHost, host,
    audioContext: audio ? () => ctx as unknown as AudioContext : () => null,
    onTime: (x) => t.push(x), onPlaying: (p) => playing.push(p), onError: (e) => errors.push(e),
    now: () => clockMs,
  });
const tick = (e: PreviewEngine) => (e as unknown as { tick(): void }).tick();
const video = () => videoHost.querySelector("video")!;

describe("the engine owns its media elements", () => {
  test("it makes one video in the video host and an audio element per voice or music piece, never more than four", async () => {
    const e = make(plan([piece("a")], [piece("v1", { src: "/f/v1.wav" }), piece("v2", { src: "/f/v2.wav" }), piece("v3", { src: "/f/v3.wav" })], [piece("m1", { src: "/f/m1.wav" }), piece("m2", { src: "/f/m2.wav" })]));
    e.setState(plan([piece("a")], [piece("v1", { src: "/f/v1.wav" }), piece("v2", { src: "/f/v2.wav" }), piece("v3", { src: "/f/v3.wav" })], [piece("m1", { src: "/f/m1.wav" }), piece("m2", { src: "/f/m2.wav" })]));
    expect(videoHost.querySelectorAll("video")).toHaveLength(1);
    expect(host.querySelectorAll("audio")).toHaveLength(MAX_AUDIO_ELEMENTS);
    expect(video().hasAttribute("controls")).toBe(false);
    expect(video().loop).toBe(false);
    expect(video().disablePictureInPicture).toBe(true);
    expect(video().disableRemotePlayback).toBe(true);
    e.dispose();
  });
  test("dispose leaves no element with a src, removes them, closes the audio context and is safe twice", async () => {
    const e = make(plan([piece("a")], [piece("v", { src: "/f/v.wav" })], [piece("m", { src: "/f/m.wav" })]));
    e.setState(plan([piece("a")], [piece("v", { src: "/f/v.wav" })], [piece("m", { src: "/f/m.wav" })]));
    await e.seek(1);
    await e.play();
    expect(document.querySelectorAll("[src]").length).toBeGreaterThan(0);
    e.dispose();
    e.dispose();
    expect(document.querySelectorAll("video, audio")).toHaveLength(0);
    expect(document.querySelectorAll("[src]")).toHaveLength(0);
    expect(e.elements()).toHaveLength(0);
    expect(ctx.closed).toBe(true);
    expect(e.isPlaying).toBe(false);
  });
  test("a removed piece's audio element is removed and its src cleared", () => {
    const e = make(plan([piece("a")], [piece("v", { src: "/f/v.wav" })]));
    e.setState(plan([piece("a")], [piece("v", { src: "/f/v.wav" })]));
    const el = host.querySelector("audio")!;
    e.setState(plan([piece("a")]));
    expect(host.querySelectorAll("audio")).toHaveLength(0);
    expect(el.hasAttribute("src")).toBe(false);
    e.dispose();
  });
});

describe("the video element is the clock", () => {
  test("play loads the first piece, seeks to its in point and plays", async () => {
    const e = make(plan([piece("a", { in_s: 3, out_s: 7 })]));
    await e.play();
    expect(video().getAttribute("src")).toBe("/f/a.mp4");
    expect(clockOf(video())).toBe(3);
    expect(e.isPlaying).toBe(true);
    expect(playing).toEqual([true]);
    e.dispose();
  });
  test("the timeline time is the video's own time within the piece", async () => {
    const e = make(plan([piece("a", { in_s: 3, out_s: 7 }), piece("b", { out_s: 5 })]));
    await e.play();
    advance(video(), 1.5);
    tick(e);
    expect(e.time).toBeCloseTo(1.5, 5);
    e.dispose();
  });
  test("at the end of a piece with another source, the next source loads and the seam time is recorded", async () => {
    const e = make(plan([piece("a", { out_s: 4 }), piece("b", { out_s: 5, in_s: 1 })]));
    await e.play();
    setClock(video(), 4.0);
    tick(e);
    await flush();
    expect(video().getAttribute("src")).toBe("/f/b.mp4");
    expect(clockOf(video())).toBe(1);
    expect(e.stats.seamsMs).toHaveLength(1);
    e.dispose();
  });
  test("two pieces of one clip that touch need no new source and no seek", async () => {
    const e = make(plan([piece("a", { src: "/f/x.mp4", in_s: 0, out_s: 2 }), piece("b", { src: "/f/x.mp4", in_s: 2, out_s: 4 })]));
    await e.play();
    setClock(video(), 2.0);
    tick(e);
    await flush();
    expect(clockOf(video())).toBe(2);
    expect(e.stats.seamsMs).toHaveLength(0);
    advance(video(), 0.5);
    tick(e);
    expect(e.time).toBeCloseTo(2.5, 5);
    e.dispose();
  });
  test("a deleted middle (same clip, a gap in the source) seeks across it", async () => {
    const e = make(plan([piece("a", { src: "/f/x.mp4", in_s: 0, out_s: 2 }), piece("b", { src: "/f/x.mp4", in_s: 6, out_s: 8 })]));
    await e.play();
    setClock(video(), 2.0);
    tick(e);
    await flush();
    expect(clockOf(video())).toBe(6);
    e.dispose();
  });
  test("a crossfade: the preview cuts to the next piece when it starts, not when the first ends", async () => {
    const state = setCrossfadeAfter(plan([piece("a", { out_s: 4 }), piece("b", { out_s: 6 })]), "a", 1);
    const e = make(state);
    await e.play();
    setClock(video(), 3.0);
    tick(e);
    await flush();
    expect(video().getAttribute("src")).toBe("/f/b.mp4");
    e.dispose();
  });
  test("the film ends: the engine pauses at the end and says it stopped", async () => {
    const e = make(plan([piece("a", { out_s: 2 })]));
    await e.play();
    setClock(video(), 2.0);
    tick(e);
    expect(e.isPlaying).toBe(false);
    expect(e.time).toBe(2);
    expect(playing.at(-1)).toBe(false);
    e.dispose();
  });
  test("loop starts again from the top", async () => {
    const e = make(plan([piece("a", { out_s: 2 })]));
    e.setLoop(true);
    await e.play();
    setClock(video(), 2.0);
    tick(e);
    await flush();
    await flush();
    expect(e.isPlaying).toBe(true);
    expect(clockOf(video())).toBe(0);
    e.dispose();
  });
  test("a play that the browser refuses reports one plain line and stays paused", async () => {
    const e = make(plan([piece("a")]));
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = () => Promise.reject(new Error("NotAllowedError"));
    await e.play();
    HTMLMediaElement.prototype.play = orig;
    expect(errors).toEqual(["The preview could not start. Press Play again."]);
    expect(e.isPlaying).toBe(false);
    e.dispose();
  });
});

describe("audio elements follow the clock", () => {
  const state = () => plan([piece("a", { out_s: 10 })], [piece("v", { src: "/f/v.wav", in_s: 1, out_s: 4, at_s: 2 })], [piece("m", { src: "/f/m.wav", out_s: 10 })]);
  const audioOf = (name: string) => [...host.querySelectorAll("audio")].find((a) => a.getAttribute("src") === name)!;
  test("a voice piece starts when the clock reaches it, at its in point plus the time into it", async () => {
    const e = make(state());
    await e.play();
    const v = audioOf("/f/v.wav");
    advance(video(), 1.0);
    tick(e);
    expect(v.paused).toBe(true);
    advance(video(), 1.5);
    tick(e);
    expect(v.paused).toBe(false);
    expect(clockOf(v)).toBeCloseTo(1 + 0.5, 5); // in at 1 s, 0.5 s into the piece
    e.dispose();
  });
  test("music inside from 0 starts with the picture", async () => {
    const e = make(state());
    await e.play();
    advance(video(), 0.1);
    tick(e);
    expect(audioOf("/f/m.wav").paused).toBe(false);
    e.dispose();
  });
  test("a drift past the limit is corrected at the sync check and measured; a small one is measured only", async () => {
    const e = make(state());
    await e.play();
    const m = audioOf("/f/m.wav");
    advance(video(), 0.5);
    tick(e);
    // the sync interval is 250 ms of the injected clock
    clockMs += 300;
    setClock(m, 0.5 + 0.05);
    advance(video(), 0.1);
    tick(e);
    expect(e.stats.driftsMs.at(-1)).toBeGreaterThanOrEqual(0);
    expect(e.stats.corrections).toBe(0);
    clockMs += 600;
    advance(video(), 0.3);
    setClock(m, clockOf(video()) + DRIFT_LIMIT_S + 0.2);
    tick(e);
    expect(e.stats.corrections).toBe(1);
    expect(clockOf(m)).toBeCloseTo(clockOf(video()), 2);
    e.dispose();
  });
  test("pause pauses every audio element", async () => {
    const e = make(state());
    await e.play();
    advance(video(), 3);
    tick(e);
    e.pause();
    expect([...host.querySelectorAll("audio")].every((a) => a.paused)).toBe(true);
    expect(video().paused).toBe(true);
    e.dispose();
  });
  test("a piece past its end stops", async () => {
    const e = make(state());
    await e.play();
    advance(video(), 2.5);
    tick(e);
    const v = audioOf("/f/v.wav");
    expect(v.paused).toBe(false);
    advance(video(), 3);
    tick(e);
    expect(v.paused).toBe(true);
    e.dispose();
  });
});

describe("gains carry level, mute, solo, fades and the crossfade", () => {
  const lastGainOf = (laneIndex: number): FakeGain => ctx.gains[1 + laneIndex] as unknown as FakeGain; // [master, video, voice, music, ...]
  test("the graph is video and each audio element into a piece gain, a lane gain and the master", async () => {
    const e = make(plan([piece("a")], [piece("v", { src: "/f/v.wav" })]));
    e.setState(plan([piece("a")], [piece("v", { src: "/f/v.wav" })]));
    await e.play();
    expect(ctx.sources).toHaveLength(2);
    expect(ctx.resumed).toBe(1);
    e.dispose();
  });
  test("mute silences a lane, solo silences the others, both click-free", async () => {
    const state = setLaneMuted(plan([piece("a")], [piece("v", { src: "/f/v.wav" })]), "voice", true);
    const e = make(state);
    await e.play();
    expect(lastGainOf(1).gain.value).toBe(0);
    e.setSolo("video");
    expect(lastGainOf(0).gain.value).toBe(1);
    expect(lastGainOf(2).gain.value).toBe(0);
    expect(lastGainOf(1).gain.calls.some((c) => c.type === "target")).toBe(true);
    e.setSolo(null);
    expect(lastGainOf(2).gain.value).toBe(1);
    e.dispose();
  });
  test("a piece fade is scheduled as a linear ramp from silence to its level", async () => {
    const state = setPieceLevel(plan([piece("a", { out_s: 8, fade_in_s: 2, fade_out_s: 1 })]), "a", -6);
    const e = make(state);
    await e.play();
    const piecePeak = 10 ** (-6 / 20);
    const gains = ctx.gains.map((g) => g as unknown as FakeGain);
    const withRamps = gains.find((g) => g.gain.calls.some((c) => c.type === "ramp"))!;
    const calls = withRamps.gain.calls;
    const set0 = calls.find((c) => c.type === "set")!;
    expect(set0.value).toBeCloseTo(0, 6);
    const ramps = calls.filter((c) => c.type === "ramp");
    expect(ramps.map((r) => r.at)).toEqual([2, 7, 8]);
    expect(ramps[0]!.value).toBeCloseTo(piecePeak, 6);
    expect(ramps[2]!.value).toBe(0);
    e.dispose();
  });
  test("without Web Audio the element volume carries the same curve", async () => {
    const e = make(plan([piece("a", { out_s: 8, fade_in_s: 2 })]), false);
    await e.play();
    advance(video(), 1);
    tick(e);
    expect(video().volume).toBeCloseTo(0.5, 2);
    e.dispose();
  });
});

describe("MP-03: effects and stems", () => {
  const stems = () => readState([
    { id: "stem-vocals", pieces: [piece("sv", { src: "/f/sv.wav" })] },
    { id: "stem-drums", pieces: [piece("sd", { src: "/f/sd.wav" })] },
    { id: "stem-bass", pieces: [piece("sb", { src: "/f/sb.wav" })] },
    { id: "stem-other", pieces: [piece("so", { src: "/f/so.wav" })] },
    { id: "music", pieces: [piece("sm", { src: "/f/sm.wav" })] },
  ]);
  const makeAudio = (state: StudioState, maxAudio?: number) =>
    new PreviewEngine(state, { videoHost: null, host, audioContext: () => ctx as unknown as AudioContext, onTime: (x) => t.push(x), onPlaying: (p) => playing.push(p), onError: (e) => errors.push(e), now: () => clockMs, maxAudio });

  test("each stem gets its own audio element, and the cap can be raised for an audio studio", () => {
    const e = makeAudio(stems(), 8);
    e.setState(stems());
    expect(host.querySelectorAll("audio")).toHaveLength(5);
    expect(host.querySelector("[data-studio-media='stem-drums']")).toBeTruthy();
    e.dispose();
    const capped = makeAudio(stems());
    capped.setState(stems());
    expect(host.querySelectorAll("audio")).toHaveLength(MAX_AUDIO_ELEMENTS);
    capped.dispose();
  });
  test("mute and solo apply to a stem lane", async () => {
    const e = makeAudio(setLaneMuted(stems(), "stem-bass", true), 8);
    await e.play();
    // ctx.gains: the master, then one gain per lane in the state's order (video, voice, music, vocals, drums, bass, other).
    const lane = (i: number) => ctx.gains[1 + i]!.gain.value;
    expect([lane(3), lane(4), lane(5), lane(6)]).toEqual([1, 1, 0, 1]);
    e.setSolo("stem-vocals");
    expect([lane(3), lane(4), lane(5), lane(6)]).toEqual([1, 0, 0, 0]);
    e.dispose();
  });
  test("the audio chain runs master, six peaking filters at the band centres, a compressor and a make-up gain to the speakers", async () => {
    const e = makeAudio(stems(), 8);
    await e.play();
    expect(ctx.filters).toHaveLength(6);
    expect(ctx.filters.map((f) => f.frequency.value)).toEqual([60, 170, 500, 1500, 5000, 12000]);
    expect(ctx.filters.every((f) => f.type === "peaking")).toBe(true);
    expect(ctx.compressors).toHaveLength(1);
    e.dispose();
  });
  test("setEffects moves the band gains and the compressor settings; neutral is transparent", async () => {
    const e = makeAudio(stems(), 8);
    await e.play();
    e.setEffects({ eq: [3, 0, -6, 0, 0, 12], compressor: { threshold_db: -24, ratio: 4, attack_ms: 20, release_ms: 250, makeup_db: 6 } });
    expect(ctx.filters.map((f) => f.gain.value)).toEqual([3, 0, -6, 0, 0, 12]);
    const c = ctx.compressors[0]!;
    expect(c.threshold.value).toBe(-24);
    expect(c.ratio.value).toBe(4);
    expect(c.attack.value).toBeCloseTo(0.02);
    expect(c.release.value).toBeCloseTo(0.25);
    e.setEffects({ eq: [0, 0, 0, 0, 0, 0], compressor: { threshold_db: -24, ratio: 1, attack_ms: 20, release_ms: 250, makeup_db: 0 } });
    expect(ctx.filters.every((f) => f.gain.value === 0)).toBe(true);
    expect(c.threshold.value).toBe(0);
    expect(c.ratio.value).toBe(1);
    e.dispose();
  });
  test("effects set before the first play are applied when the graph is built", async () => {
    const e = makeAudio(stems(), 8);
    e.setEffects({ eq: [0, 5, 0, 0, 0, 0], compressor: { threshold_db: 0, ratio: 1, attack_ms: 10, release_ms: 100, makeup_db: 0 } });
    await e.play();
    expect(ctx.filters[1]!.gain.value).toBe(5);
    e.dispose();
  });
});
