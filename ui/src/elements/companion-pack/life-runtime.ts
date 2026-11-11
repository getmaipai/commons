import { clamp01, imageData, smooth } from "./canvas-util";
import type { Cue } from "./cues";
import { LIFE_CHARACTER_PROFILE, planBlinks, planFx, planInhales, planMicro, PROFILE } from "./life";
import type { BlinkEvent, LifeEvent, LifeProfile, MicroEvent } from "./life";
import { loudAt } from "./loud";
import type { Lid } from "./lids";
import type { PoseWeights } from "./head";
import { tickTime } from "./speech";
import type { EventWindow } from "./tags";

/** Canvas px at 480 to frame px (size / 480; 1.2 for the 576 px demo frame): poses are baked at 1 frame px peak. */
export const wPx = (frameSize: number): number => frameSize / 480;
export type LifeSample = { fx: PoseWeights; loud: number; express: number; lid: Lid | null; wide: boolean; shoulder: number };
export type LifeOptions = {
  cues: Cue[]; loudness: Float32Array; envelope?: Float32Array; events: EventWindow[]; duration?: number; seed?: number;
  packId: string; poses: string[]; life: Record<string, number>; cadence: number; profile?: LifeProfile;
  /** Side of the pack frame in pixels; 576 (the demo frame) when absent. */
  frameSize?: number;
};
export type LifeContext = { emoSum: number; alive?: number; intensity?: number; sa?: number };
export type LifeRuntime = {
  sample(clock: number, ctx: LifeContext): LifeSample;
  plan: { fx: LifeEvent[]; micro: MicroEvent[]; blinks: BlinkEvent[]; inhales: number[] };
};

/** Rise, fall (s) of a planned head event; the hold is the rest of its duration (the demo's r/h/f per pose). */
export function eventShape(event: LifeEvent): [number, number] {
  if (event.channel === "brow") return [0.1, 0.28];
  if (event.channel === "nod") return event.duration < 0.8 ? [0.12, 0.35] : [0.5, 0.5];
  if (event.channel === "tilt") return event.duration < 1 ? [0.15, 0.4] : [0.4, 0.6];
  return [0.16, 0.3];
}
const poseOf = (event: LifeEvent): string => (event.channel === "gaze" ? `gaze${event.direction ?? "U"}` : event.channel);

/** Blink eyelid closure 0..1 at a time (fast down, slower up). */
export function blinkAt(blinks: BlinkEvent[], time: number): number {
  for (const b of blinks) {
    if (time < b.t0 || time > b.t0 + b.duration) continue;
    const e = time - b.t0;
    return e <= b.down ? b.amp * (e / b.down) : b.amp * Math.max(0, 1 - (e - b.down) / (b.duration - b.down));
  }
  return 0;
}

export function createLifeRuntime(o: LifeOptions): LifeRuntime {
  const duration = o.duration ?? o.cues[o.cues.length - 1]?.t1 ?? 0; const seed = o.seed ?? 1; const W_PX = wPx(o.frameSize ?? 576); const env = o.envelope ?? o.loudness;
  const profile = o.profile ?? LIFE_CHARACTER_PROFILE(o.packId); const loudCfg = profile.loud ?? {};
  const plan = {
    fx: planFx(o.cues, env, duration, seed), micro: planMicro(o.cues, env, duration, seed, profile.micro),
    blinks: planBlinks(o.cues, duration, seed), inhales: planInhales(o.cues, o.loudness),
  };
  const fx: PoseWeights = Object.fromEntries(o.poses.map((p) => [p, 0]));
  const back = profile.vocal?.back ?? 1; const dip = profile.vocal?.dip ?? 1;
  return {
    plan,
    sample(rawClock, ctx) {
      for (const pose of o.poses) fx[pose] = 0;
      const out: LifeSample = { fx, loud: 0, express: 0, lid: null, wide: false, shoulder: 0 };
      if (rawClock < 0) return out;
      const clock = tickTime(rawClock, o.cadence); const alive = ctx.alive ?? 1;
      const add = (pose: string, v: number) => { if (pose in fx && v) fx[pose]! += v; };
      const idx = Math.min(o.loudness.length - 1, Math.max(0, Math.floor(clock / 0.01)));
      const express = o.loudness.length ? o.loudness[idx]! : 0; out.express = express;
      const intensity = (ctx.intensity ?? 1) * 0.6 * (1 + 1.8 * express);
      for (const e of plan.fx) {
        const pose = poseOf(e); if (!(pose in fx)) continue;
        const [rise, fall] = eventShape(e);
        const v = e.amp * intensity * (o.life[pose] ?? 1) * PROFILE(clock - e.t0, rise, Math.max(0, e.duration - rise - fall), fall);
        if (v > fx[pose]!) fx[pose] = v;
      }
      if (alive > 0) {
        for (const e of plan.micro) { const p = PROFILE(clock - e.t0, e.rise, e.hold, e.fall); if (p > 0) add(e.pose, e.sign * e.px * W_PX * alive * p); }
      }
      add("mWrinkle", 0.12 * Math.max(0, fx.smile ?? 0));
      let sh = 0; let shNeg = 0; const H = 480 * (profile.shoulderPct ?? 0.01);
      const L = loudAt(o.loudness, clock); out.loud = L;
      if (L > 0) {
        add("eyeWide", (loudCfg.eyeWide ?? 0.2) * L);
        add("brow", (profile.browShout ?? 1) * L * Math.max(0, 1 - 1.3 * ctx.emoSum));
        sh = Math.max(sh, H * L);
        if ("nod" in fx) fx.nod = Math.min(fx.nod!, loudCfg.nodCap ?? 1.4);
        if ("tilt" in fx) fx.tilt = Math.min(fx.tilt!, loudCfg.tiltCap ?? 0.9);
      }
      for (const t of plan.inhales) sh = Math.max(sh, 1.6 * PROFILE(clock - (t - 0.32), 0.26, 0.04, 0.12));
      for (const e of o.events) {
        const u = clock - e.t0; const d = Math.max(0.1, e.t1 - e.t0); const pk = e.peaks?.length ? e.peaks : null;
        if (e.type === "laugh" || e.type === "chuckle") {
          const k = e.type === "laugh" ? 1 : 0.55;
          const env2 = PROFILE(u, 0.12, Math.max(0.05, d - 0.12 - 0.3), 0.3);
          const after = PROFILE(clock - e.t1, 0.001, 1, 0.6);
          add("eyeSquint", k * Math.max(env2, 0.3 * after)); add("tilt", 0.6 * k * env2); add("smile", 9 * k * Math.max(env2, 0.7 * after));
          if (env2 > 0.3) out.wide = true;
          add("brow", 0.4 * k * env2); add("nod", -back * 0.9 * k * env2); add("mWrinkle", k * env2);
          const ps = pk ?? Array.from({ length: Math.max(1, Math.round(d * 5)) }, (_, i) => e.t0 + (i + 0.5) / 5);
          let b = 0;
          for (const p of ps) { const w = 0.2; const x = (clock - p + w / 2) / w; b = Math.max(b, x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) ** 2); }
          sh = Math.max(sh, H * 0.8 * k * b * env2);
        } else if (e.type === "cough") {
          const ps: number[] = pk ?? [e.t0 + 0.05]; let dipv = 0; let eye = 0; let jolt = 0;
          ps.forEach((p, j) => {
            const sc = j ? 0.5 : 1;
            dipv = Math.max(dipv, sc * PROFILE(clock - (p - 0.04), 0.06, 0.08, 0.35)); eye = Math.max(eye, PROFILE(clock - (p - 0.05), 0.05, 0.2, 0.18));
            jolt = Math.max(jolt, sc * PROFILE(clock - (p - 0.03), 0.04, 0.04, 0.2));
          });
          add("nod", dip * 0.9 * dipv);
          add("eyeClosed", eye);
          add("mPress", 2 * (clock > e.t0 && clock < e.t1 + 0.1 ? 1 : 0));
          sh = Math.max(sh, H * 0.62 * jolt);
        } else if (e.type === "sigh") {
          const env2 = PROFILE(u, 0.25, Math.max(0.1, d - 0.4), 0.4);
          add("eyeHalf", env2); add("nod", dip * 0.4 * env2);
          sh = Math.max(sh, H * 0.75 * smooth(u / (0.4 * d)) * (1 - smooth((u - 0.45 * d) / (0.55 * d))));
          shNeg = Math.max(shNeg, H * 0.5 * PROFILE(u - 0.45 * d, 0.2 * d, 0.15 * d, 0.45 * d));
        } else if (e.type === "gasp") {
          const env2 = PROFILE(u + 0.03, 0.08, Math.max(0.3, d - 0.05), 0.45);
          add("eyeWide", 0.95 * env2);
          add("brow", 0.9 * env2);
          add("nod", -back * 0.75 * env2);
          sh = Math.max(sh, H * 0.75 * PROFILE(u, 0.2, Math.max(0.3, d), 0.5));
        } else if (e.type === "clear throat") {
          const env2 = PROFILE(u, 0.1, d, 0.25); const p0 = (pk ?? [e.t0 + 0.1])[0]!;
          add("nod", dip * 0.35 * env2); add("mPress", 2 * (clock > e.t0 - 0.03 && clock < e.t1 + 0.1 ? 1 : 0));
          sh = Math.max(sh, H * 0.38 * PROFILE(clock - (p0 - 0.03), 0.05, 0.04, 0.2));
        }
      }
      add("eyeClosed", blinkAt(plan.blinks, clock));
      const half = clamp01(Math.max(fx.eyeHalf ?? 0, 0.9 * (fx.eyeSquint ?? 0))); const closed = clamp01(fx.eyeClosed ?? 0);
      out.lid = half < 0.01 && closed < 0.01 ? null : { half, closed };
      for (const eye of ["eyeSquint", "eyeClosed", "eyeHalf", "eyeWide"]) if (eye in fx) fx[eye] = 0;
      // lids are a picture layer, never a flow across the eyeball
      out.shoulder = (sh - shNeg) * Math.min(1.3, 0.5 + alive * 0.5);
      return out;
    },
  };
}

/** Shoulder shift: rows below `y0` move up by `dy * ramp`, with no shift at the sides. Pure over RGBA rows, for tests. */
export function shiftRows(src: Uint8ClampedArray, out: Uint8ClampedArray, W: number, Hh: number, y0: number, y1: number, dy: number, edge: number): void {
  const taper = new Float32Array(W);
  for (let x = 0; x < W; x++) taper[x] = smooth(Math.min(x, W - 1 - x) / edge);
  for (let y = 0; y < Hh; y++) {
    const yy = y + y0; const wy = yy >= y1 ? 1 : smooth((yy - y0) / (y1 - y0));
    for (let x = 0; x < W; x++) {
      const sy = Math.min(Hh - 1.001, y + dy * wy * taper[x]!);
      const yi = sy | 0;
      const f = sy - yi;
      const q0 = (yi * W + x) * 4;
      const q1 = q0 + W * 4;
      const o4 = (y * W + x) * 4;
      for (let ch = 0; ch < 4; ch++) out[o4 + ch] = src[q0 + ch]! * (1 - f) + src[q1 + ch]! * f;
    }
  }
}
export function applyShoulder(ctx: CanvasRenderingContext2D, dy: number, band: [number, number]): void {
  const { width, height } = ctx.canvas; const s = width / 480; const y0 = Math.floor(band[0] * s); const y1 = band[1] * s;
  const Hh = height - y0; if (Hh < 2) return;
  const src = ctx.getImageData(0, y0, width, Hh); const out = new Uint8ClampedArray(src.data.length);
  shiftRows(src.data, out, width, Hh, y0, y1, dy * s, 70 * s);
  ctx.putImageData(imageData(out, width, Hh), 0, y0);
}
