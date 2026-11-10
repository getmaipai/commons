import { clamp01 } from "./canvas-util";
import type { Cue } from "./cues";

/**
 * MAKER-G voice layer: reactive parts (pictures with alpha) drawn over a still picture. Everything here is pure maths so it
 * can be tested without a canvas; `voice-player.tsx` draws the result. Data shapes follow `spec/gen/ts/companion-pack.ts`.
 */
export type VoiceState = "idle" | "listen" | "think" | "speak" | "interrupt";
export type Range = [number, number];
export type VoiceDrive = { amount?: number; hz?: number; depth?: number; beat?: boolean };
export type VoiceCurve = "linear" | "ease-in" | "ease-out" | "smooth" | "pulse" | "blink";
export type VoiceEffect = {
  channel: "level" | "cue_energy" | "state";
  curve?: VoiceCurve;
  smoothing?: { attackMs?: number; releaseMs?: number };
  drive?: Partial<Record<VoiceState, VoiceDrive>>;
  blinkMs?: number;
  scale?: Range; scaleX?: Range; scaleY?: Range; rotate?: Range;
  translate?: { x?: Range; y?: Range };
  opacity?: Range; brightness?: Range; glow?: Range;
};
export type VoicePart = {
  id: string;
  file: string;
  box: { x: number; y: number; w: number; h: number };
  anchor?: { x: number; y: number };
  z?: number;
  glow?: { color: string; blur?: number };
  effects: VoiceEffect[];
};
export type VoiceLayerData = {
  base?: string;
  parts: VoicePart[];
  presets?: Partial<Record<VoiceState, { gain?: number }>>;
};
/** The transform and look of one part for one frame; the neutral pose draws the part exactly where the picture has it. */
export type PartPose = {
  id: string; scaleX: number; scaleY: number; rotate: number; tx: number; ty: number; opacity: number; brightness: number; glow: number;
};

/** Calm defaults and hard limits: a pack cannot ask for violent motion. */
export const CALM = {
  attackMs: 60, releaseMs: 220, beatSeconds: 0.35, interruptSeconds: 0.4, blinkMs: 140,
  scale: [0.05, 1.5], rotate: 15, translate: 24, brightness: [1, 2],
} as const;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Shapes a 0..1 value; `pulse` and `blink` are time shapes handled by `stateValue`, so they are linear here. */
export function applyCurve(curve: VoiceCurve | undefined, x: number): number {
  const v = clamp01(x);
  switch (curve) {
    case "ease-in": return v * v;
    case "ease-out": return 1 - (1 - v) * (1 - v);
    case "smooth": return v * v * (3 - 2 * v);
    default: return v;
  }
}

/** One-pole follower: rises at `attackMs`, falls at `releaseMs` (time constants; 0 follows at once). */
export function followLevel(previous: number, target: number, dtMs: number, attackMs: number, releaseMs: number): number {
  const tau = target > previous ? attackMs : releaseMs;
  if (tau <= 0 || dtMs <= 0) return tau <= 0 ? target : previous;
  return previous + (target - previous) * (1 - Math.exp(-dtMs / tau));
}

/** Voice level 0..1 at `clock` seconds from a 100 Hz track (the speech envelope or loudness); the envelope runs up to about 1.4, so it clips at 1. */
export function envelopeAt(track: ArrayLike<number> | undefined, clock: number): number {
  if (!track || track.length === 0 || clock < 0) return 0;
  const position = clock * 100;
  const i = Math.floor(position);
  if (i >= track.length) return 0;
  const a = track[i] ?? 0;
  const b = track[Math.min(track.length - 1, i + 1)] ?? a;
  return clamp01(a + (b - a) * (position - i));
}

const CUE_ENERGY: Record<string, number> = { A: 0, B: 0.25, C: 0.5, D: 1, E: 0.7, F: 0.5, G: 0.3, H: 0.35 };
/** How open the spoken sound is at `clock` (0 closed or silent, 1 widest vowel), from the mouth-shape cues. */
export function cueEnergyAt(cues: readonly Cue[] | undefined, clock: number): number {
  if (!cues || clock < 0) return 0;
  const cue = cues.find((c) => clock >= c.t0 && clock < c.t1);
  return !cue || cue.p === "_" ? 0 : CUE_ENERGY[cue.l] ?? 0;
}

/**
 * The 0..1 driver of a `state` channel effect: the state's steady `amount`, plus a `depth` sized sine pulse at `hz` (curve pulse),
 * or a short blink every 1/hz seconds (curve blink), plus one beat when the state was just entered (`beat`).
 */
export function stateValue(
  drive: VoiceDrive | undefined, curve: VoiceCurve | undefined, seconds: number, sinceEnter: number, blinkMs: number = CALM.blinkMs,
): number {
  if (!drive) return 0;
  let value = drive.amount ?? 0;
  const hz = drive.hz ?? 0;
  const depth = drive.depth ?? 1;
  if (curve === "pulse" && hz > 0) value += depth * (0.5 - 0.5 * Math.cos(2 * Math.PI * hz * seconds));
  else if (curve === "blink" && hz > 0) {
    const period = 1 / hz;
    const into = (seconds % period) * 1000;
    if (into < blinkMs) value += depth * Math.sin(Math.PI * (into / blinkMs));
  }
  if (drive.beat && sinceEnter >= 0 && sinceEnter < CALM.beatSeconds) value += depth * Math.sin(Math.PI * (sinceEnter / CALM.beatSeconds)) ** 2;
  return clamp01(value);
}

const lerp = (range: Range, t: number) => range[0] + (range[1] - range[0]) * t;
const neutralPose = (id: string): PartPose => ({ id, scaleX: 1, scaleY: 1, rotate: 0, tx: 0, ty: 0, opacity: 1, brightness: 1, glow: 0 });

/** Plays a voice layer: feed it the state and, each frame, the level and cue energy; it returns one pose per part. */
export class VoiceRuntime {
  private smoothed: number[][];
  private state: VoiceState = "idle";
  private enteredAt = 0;
  private interruptUntil = 0;
  private lastNow: number | undefined;
  private requested: VoiceState = "idle";

  constructor(readonly layer: VoiceLayerData) {
    this.smoothed = layer.parts.map((part) => part.effects.map(() => 0));
  }

  /** The state the effects currently follow ("interrupt" lasts a moment after the listener cuts the speaker off). */
  get current(): VoiceState { return this.state; }

  /** Tells the runtime the companion's state at `nowMs`. Speak then listen is an interruption: the `interrupt` preset runs for 400 ms first. */
  setState(next: "idle" | "listen" | "think" | "speak", nowMs: number): void {
    if (next === this.requested && this.lastNow !== undefined) return;
    const was = this.requested;
    this.requested = next;
    this.enteredAt = nowMs;
    if (was === "speak" && next === "listen") this.interruptUntil = nowMs + CALM.interruptSeconds * 1000;
    if (nowMs < this.interruptUntil) this.enteredAt = this.interruptUntil;
    this.state = next;
  }

  /** Advances to `nowMs` and returns the poses (same order as `layer.parts`). */
  step(nowMs: number, input: { level: number; cue: number }): PartPose[] {
    const dt = this.lastNow === undefined ? 0 : Math.min(250, Math.max(0, nowMs - this.lastNow));
    this.lastNow = nowMs;
    let state: VoiceState = this.requested;
    let since = (nowMs - this.enteredAt) / 1000;
    if (nowMs < this.interruptUntil) { state = "interrupt"; since = (nowMs - (this.interruptUntil - CALM.interruptSeconds * 1000)) / 1000; }
    this.state = state;
    const gain = clamp(this.layer.presets?.[state]?.gain ?? 1, 0, 2);
    const seconds = nowMs / 1000;
    return this.layer.parts.map((part, p) => {
      const pose = neutralPose(part.id);
      let glow = 0;
      part.effects.forEach((effect, e) => {
        const timed = effect.channel === "state";
        const raw = effect.channel === "level" ? input.level : effect.channel === "cue_energy" ? input.cue
          : stateValue(effect.drive?.[state], effect.curve, seconds, since, effect.blinkMs);
        const shaped = timed ? raw : applyCurve(effect.curve, raw);
        const attack = effect.smoothing?.attackMs ?? (timed ? 0 : CALM.attackMs);
        const release = effect.smoothing?.releaseMs ?? (timed ? 0 : CALM.releaseMs);
        const row = this.smoothed[p]!;
        row[e] = followLevel(row[e]!, shaped, dt, attack, release);
        const t = clamp01(row[e]! * gain);
        if (effect.scale) { const s = clamp(lerp(effect.scale, t), CALM.scale[0], CALM.scale[1]); pose.scaleX *= s; pose.scaleY *= s; }
        if (effect.scaleX) pose.scaleX *= clamp(lerp(effect.scaleX, t), CALM.scale[0], CALM.scale[1]);
        if (effect.scaleY) pose.scaleY *= clamp(lerp(effect.scaleY, t), CALM.scale[0], CALM.scale[1]);
        if (effect.rotate) pose.rotate += clamp(lerp(effect.rotate, t), -CALM.rotate, CALM.rotate);
        if (effect.translate?.x) pose.tx += clamp(lerp(effect.translate.x, t), -CALM.translate, CALM.translate);
        if (effect.translate?.y) pose.ty += clamp(lerp(effect.translate.y, t), -CALM.translate, CALM.translate);
        if (effect.opacity) pose.opacity *= clamp01(lerp(effect.opacity, t));
        if (effect.brightness) pose.brightness *= clamp(lerp(effect.brightness, t), CALM.brightness[0], CALM.brightness[1]);
        if (effect.glow) glow = Math.max(glow, clamp01(lerp(effect.glow, t)));
      });
      pose.glow = part.glow ? glow : 0;
      return pose;
    });
  }
}

/** The 2D drawing surface the frame painter needs (a subset of CanvasRenderingContext2D, so tests can record calls). */
export type VoiceCtx = Pick<CanvasRenderingContext2D,
  "save" | "restore" | "translate" | "rotate" | "scale" | "drawImage" | "clearRect"
  | "globalAlpha" | "globalCompositeOperation" | "shadowColor" | "shadowBlur" | "shadowOffsetX" | "shadowOffsetY">;
export type VoiceImages = { base: CanvasImageSource; parts: Record<string, CanvasImageSource> };
/** Distance, in tile pixels, the glow pass draws a part off canvas so only its shadow lands on screen. */
const GLOW_OFFSET = 4000;

/** Paints one frame: the base picture, then the parts by `z` (ties keep the pack's order). `size` is the canvas width in pixels; boxes are in 480 pixel tile space. */
export function drawVoiceFrame(ctx: VoiceCtx, size: number, tile: number, layer: VoiceLayerData, images: VoiceImages, poses: PartPose[]): void {
  const k = size / tile;
  ctx.clearRect(0, 0, size, size);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(images.base, 0, 0, size, size);
  const order = layer.parts.map((part, index) => ({ part, pose: poses[index]!, index }))
    .sort((a, b) => (a.part.z ?? 0) - (b.part.z ?? 0) || a.index - b.index);
  for (const { part, pose } of order) {
    const image = images.parts[part.id];
    if (!image || pose.opacity <= 0.001) continue;
    const { x, y, w, h } = part.box;
    const ox = (x + (part.anchor?.x ?? 0.5) * w) * k;
    const oy = (y + (part.anchor?.y ?? 0.5) * h) * k;
    const left = -(part.anchor?.x ?? 0.5) * w * k;
    const top = -(part.anchor?.y ?? 0.5) * h * k;
    ctx.save();
    ctx.translate(ox + pose.tx * k, oy + pose.ty * k);
    const radians = (pose.rotate * Math.PI) / 180;
    if (radians) ctx.rotate(radians);
    ctx.scale(pose.scaleX, pose.scaleY);
    if (part.glow && pose.glow > 0.004) {
      // Canvas shadows live in device space: draw the picture far off to the side and shift its shadow back by the same device distance.
      const local = GLOW_OFFSET / Math.max(0.05, Math.abs(pose.scaleX));
      const device = local * pose.scaleX;
      ctx.globalAlpha = pose.opacity;
      ctx.shadowColor = rgba(part.glow.color, pose.glow);
      ctx.shadowBlur = (part.glow.blur ?? 24) * k;
      ctx.shadowOffsetX = -device * Math.cos(radians);
      ctx.shadowOffsetY = -device * Math.sin(radians);
      ctx.drawImage(image, left + local, top, w * k, h * k);
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    }
    ctx.globalAlpha = pose.opacity;
    ctx.drawImage(image, left, top, w * k, h * k);
    if (pose.brightness > 1.001) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = pose.opacity * (pose.brightness - 1);
      ctx.drawImage(image, left, top, w * k, h * k);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

const rgba = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp01(alpha).toFixed(3)})`;
};
