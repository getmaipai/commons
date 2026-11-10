import { describe, expect, test } from "bun:test";
import type { Cue } from "./cues";
import golden from "./fixtures/golden-fast-lines.json";
import {
  applyCurve, cueEnergyAt, drawVoiceFrame, envelopeAt, followLevel, stateValue, VoiceRuntime,
} from "./voice-layer";
import type { VoiceImages, VoiceLayerData } from "./voice-layer";

const heart: VoiceLayerData = {
  base: "base.webp",
  parts: [{
    id: "heart", file: "heart.webp", box: { x: 200, y: 280, w: 100, h: 90 }, anchor: { x: 0.5, y: 0.5 }, glow: { color: "#ff3b30", blur: 20 },
    effects: [
      { channel: "level", smoothing: { attackMs: 40, releaseMs: 200 }, scale: [1, 1.12], glow: [0, 1] },
      { channel: "state", curve: "pulse", scale: [1, 1.06], drive: { idle: { hz: 0.25, depth: 0.35 }, think: { hz: 0.9, depth: 0.6 }, listen: { beat: true, depth: 1 } } },
    ],
  }],
};
/** Runs the runtime for `ms` at 16 ms frames with a constant input and returns the last poses. */
function run(rt: VoiceRuntime, from: number, ms: number, level = 0) {
  let poses = rt.step(from, { level, cue: 0 });
  for (let t = from + 16; t <= from + ms; t += 16) poses = rt.step(t, { level, cue: 0 });
  return poses;
}

describe("curves, smoothing and tracks", () => {
  test("curves keep 0 and 1 and clip outside", () => {
    for (const curve of ["linear", "ease-in", "ease-out", "smooth"] as const) {
      expect(applyCurve(curve, 0)).toBe(0);
      expect(applyCurve(curve, 1)).toBe(1);
      expect(applyCurve(curve, 2)).toBe(1);
      expect(applyCurve(curve, -1)).toBe(0);
    }
    expect(applyCurve("ease-in", 0.5)).toBe(0.25);
    expect(applyCurve("ease-out", 0.5)).toBe(0.75);
  });
  test("attack is quicker than release and zero time follows at once", () => {
    const up = followLevel(0, 1, 40, 40, 200);
    const down = followLevel(1, 0, 40, 40, 200);
    expect(up).toBeCloseTo(1 - Math.exp(-1), 5);
    expect(1 - down).toBeLessThan(up);
    expect(followLevel(0.2, 0.9, 16, 0, 0)).toBe(0.9);
  });
  test("the envelope track is read at 100 Hz, interpolated, and clipped to 1", () => {
    const track = new Float32Array([0, 0.5, 1.4, 0.2]);
    expect(envelopeAt(track, 0.005)).toBeCloseTo(0.25, 5);
    expect(envelopeAt(track, 0.02)).toBe(1);
    expect(envelopeAt(track, 5)).toBe(0);
    expect(envelopeAt(track, -1)).toBe(0);
    expect(envelopeAt(undefined, 0.1)).toBe(0);
  });
  test("cue energy follows the open vowels of the golden line and is zero in silence", () => {
    const cues = golden[2]!.cues as Cue[];
    const d = cues.find((c) => c.l === "D")!;
    expect(cueEnergyAt(cues, (d.t0 + d.t1) / 2)).toBe(1);
    const closed = cues.find((c) => c.p === "M")!;
    expect(cueEnergyAt(cues, (closed.t0 + closed.t1) / 2)).toBe(0);
    expect(cueEnergyAt(cues, 99)).toBe(0);
  });
  test("state drive: steady amount, sine pulse, blink window and one beat", () => {
    expect(stateValue({ amount: 0.3 }, undefined, 5, 5)).toBe(0.3);
    expect(stateValue({ hz: 1, depth: 0.5 }, "pulse", 0, 5)).toBeCloseTo(0, 6);
    expect(stateValue({ hz: 1, depth: 0.5 }, "pulse", 0.5, 5)).toBeCloseTo(0.5, 6);
    expect(stateValue({ hz: 0.5 }, "blink", 0.07, 5, 140)).toBeCloseTo(1, 5);
    expect(stateValue({ hz: 0.5 }, "blink", 0.5, 5, 140)).toBe(0);
    expect(stateValue({ beat: true, depth: 1 }, undefined, 3, 0.175)).toBeCloseTo(1, 5);
    expect(stateValue({ beat: true }, undefined, 3, 0.4)).toBe(0);
    expect(stateValue(undefined, "pulse", 1, 1)).toBe(0);
  });
});

describe("VoiceRuntime: the heart", () => {
  test("silent speech leaves the heart at its neutral pose", () => {
    const rt = new VoiceRuntime(heart);
    rt.setState("speak", 0);
    const pose = run(rt, 0, 1000, 0)[0]!;
    expect(pose.scaleX).toBe(1);
    expect(pose.glow).toBe(0);
  });
  test("the heart scale follows a known level: 0.5 gives 1.06 and 1.0 gives 1.12, with glow following too", () => {
    const rt = new VoiceRuntime(heart);
    rt.setState("speak", 0);
    const half = run(rt, 0, 2000, 0.5)[0]!;
    expect(half.scaleX).toBeCloseTo(1.06, 3);
    expect(half.scaleY).toBeCloseTo(1.06, 3);
    expect(half.glow).toBeCloseTo(0.5, 3);
    const full = run(rt, 2000, 2000, 1)[0]!;
    expect(full.scaleX).toBeCloseTo(1.12, 3);
    expect(full.glow).toBeCloseTo(1, 3);
    const released = run(rt, 4000, 2000, 0)[0]!;
    expect(released.scaleX).toBeCloseTo(1, 3);
  });
  test("attack is faster than release", () => {
    const rt = new VoiceRuntime(heart);
    rt.setState("speak", 0);
    const rose = run(rt, 0, 80, 1)[0]!.scaleX - 1;
    const rt2 = new VoiceRuntime(heart);
    rt2.setState("speak", 0);
    run(rt2, 0, 2000, 1);
    const fell = 0.12 - (run(rt2, 2000, 80, 0)[0]!.scaleX - 1);
    expect(rose).toBeGreaterThan(fell);
  });
  test("idle breathes slowly and thinking pulses faster", () => {
    const idle = new VoiceRuntime(heart);
    idle.setState("idle", 0);
    const peaks = (rt: VoiceRuntime, ms: number) => { let top = 0; let crossings = 0; let above = false; for (let t = 0; t < ms; t += 16) { const s = rt.step(t, { level: 0, cue: 0 })[0]!.scaleX - 1; top = Math.max(top, s); const now = s > top / 2; if (now && !above) crossings++; above = now; } return { top, crossings }; };
    const slow = peaks(idle, 8000);
    const think = new VoiceRuntime(heart);
    think.setState("think", 0);
    const fast = peaks(think, 8000);
    expect(slow.top).toBeGreaterThan(0.005);
    expect(slow.top).toBeLessThan(0.03);
    expect(fast.crossings).toBeGreaterThan(slow.crossings * 2);
  });
  test("entering listen gives one beat that dies out", () => {
    const rt = new VoiceRuntime(heart);
    rt.setState("speak", 0);
    run(rt, 0, 500, 0);
    rt.setState("idle", 600);
    rt.setState("listen", 1000);
    const during = rt.step(1000 + 175, { level: 0, cue: 0 })[0]!.scaleX;
    const after = run(rt, 1200, 1500, 0)[0]!.scaleX;
    expect(during).toBeGreaterThan(1.05);
    expect(after).toBeCloseTo(1, 3);
  });
  test("speak then listen runs the interrupt preset first, then listen", () => {
    const rt = new VoiceRuntime({ ...heart, presets: { interrupt: { gain: 0.5 } } });
    rt.setState("speak", 0);
    rt.step(0, { level: 0, cue: 0 });
    rt.setState("listen", 100);
    rt.step(150, { level: 0, cue: 0 });
    expect(rt.current).toBe("interrupt");
    rt.step(600, { level: 0, cue: 0 });
    expect(rt.current).toBe("listen");
  });
  test("a pack cannot ask for violent motion", () => {
    const wild: VoiceLayerData = { parts: [{ id: "a", file: "a.webp", box: { x: 0, y: 0, w: 10, h: 10 }, effects: [{ channel: "level", scale: [1, 9], rotate: [0, 180], translate: { x: [0, 500] }, brightness: [1, 9] }] }] };
    const rt = new VoiceRuntime(wild);
    rt.setState("speak", 0);
    const pose = run(rt, 0, 3000, 1)[0]!;
    expect(pose.scaleX).toBe(1.5);
    expect(pose.rotate).toBe(15);
    expect(pose.tx).toBe(24);
    expect(pose.brightness).toBe(2);
  });
  test("a happy blink flattens the eye arcs and then lets them open", () => {
    const eye: VoiceLayerData = { parts: [{ id: "eye", file: "e.webp", box: { x: 100, y: 130, w: 100, h: 60 }, effects: [{ channel: "state", curve: "blink", blinkMs: 150, scaleY: [1, 0.12], drive: { idle: { hz: 0.5 } } }] }] };
    const rt = new VoiceRuntime(eye);
    rt.setState("idle", 0);
    expect(rt.step(75, { level: 0, cue: 0 })[0]!.scaleY).toBeCloseTo(0.12, 2);
    expect(rt.step(1000, { level: 0, cue: 0 })[0]!.scaleY).toBe(1);
  });
});

type Call = [string, ...unknown[]];
function recorder() {
  const calls: Call[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, key: string) => (...args: unknown[]) => { calls.push([key, ...args]); },
    set: (_t, key: string, value) => { calls.push([`set ${key}`, value]); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe("drawVoiceFrame", () => {
  const images: VoiceImages = { base: "BASE" as never, parts: { heart: "HEART" as never } };
  test("draws the base, then the heart scaled about its anchor", () => {
    const rt = new VoiceRuntime(heart);
    rt.setState("speak", 0);
    const poses = run(rt, 0, 2000, 1);
    const { ctx, calls } = recorder();
    drawVoiceFrame(ctx, 480, 480, heart, images, poses);
    const names = calls.map((c) => c[0]);
    expect(names[0]).toBe("clearRect");
    expect(calls.find((c) => c[0] === "drawImage")![1]).toBe("BASE");
    const translate = calls.find((c) => c[0] === "translate")!;
    expect(translate[1]).toBeCloseTo(250, 5);
    expect(translate[2]).toBeCloseTo(325, 5);
    const scale = calls.find((c) => c[0] === "scale")!;
    expect(scale[1]).toBeCloseTo(1.12, 3);
    expect(calls.some((c) => c[0] === "set shadowColor" && String(c[1]).startsWith("rgba(255, 59, 48"))).toBe(true);
    expect(names.filter((n) => n === "save")).toHaveLength(1);
    expect(names.filter((n) => n === "restore")).toHaveLength(1);
  });
  test("the canvas size scales the tile: a 320 pixel phone canvas halves nothing but 2/3", () => {
    const rt = new VoiceRuntime(heart);
    rt.setState("speak", 0);
    const { ctx, calls } = recorder();
    drawVoiceFrame(ctx, 320, 480, heart, images, rt.step(0, { level: 0, cue: 0 }));
    expect(calls.find((c) => c[0] === "translate")![1]).toBeCloseTo(250 * (320 / 480), 5);
  });
  test("at the neutral pose the part is drawn once with no glow pass", () => {
    const rt = new VoiceRuntime({ ...heart, parts: [{ ...heart.parts[0]!, effects: [heart.parts[0]!.effects[0]!] }] });
    rt.setState("speak", 0);
    const { ctx, calls } = recorder();
    drawVoiceFrame(ctx, 480, 480, heart, images, rt.step(0, { level: 0, cue: 0 }));
    expect(calls.filter((c) => c[0] === "drawImage")).toHaveLength(2);
    expect(calls.some((c) => c[0] === "set shadowColor")).toBe(false);
  });
  test("parts draw in z order", () => {
    const layer: VoiceLayerData = { parts: [
      { id: "top", file: "t.webp", box: { x: 0, y: 0, w: 10, h: 10 }, z: 5, effects: [{ channel: "level", scale: [1, 1.1] }] },
      { id: "low", file: "l.webp", box: { x: 0, y: 0, w: 10, h: 10 }, z: 1, effects: [{ channel: "level", scale: [1, 1.1] }] },
    ] };
    const rt = new VoiceRuntime(layer);
    const { ctx, calls } = recorder();
    drawVoiceFrame(ctx, 480, 480, layer, { base: "B" as never, parts: { top: "TOP" as never, low: "LOW" as never } }, rt.step(0, { level: 0, cue: 0 }));
    expect(calls.filter((c) => c[0] === "drawImage").map((c) => c[1])).toEqual(["B", "LOW", "TOP"]);
  });
});
