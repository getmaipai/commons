import { clamp01 } from "./canvas-util";
import type { Cue } from "./cues";
import { drawEmotionMix, chooseEmotion, emotionLevel, newEmotionWeights, stepEmotionWeights } from "./emotion";
import { frameOf, frameScale, trackAt } from "./geometry";
import type { Affine, PackFrame } from "./geometry";
import { drawHead } from "./head";
import { drawLids, newLidState } from "./lids";
import { applyShoulder, createLifeRuntime } from "./life-runtime";
import type { LifeRuntime, LifeSample } from "./life-runtime";
import { drawMouth, newMouthState } from "./mouth";
import type { MouthSet } from "./pack-loader";
import type { LoadedPack } from "./pack-loader";
import { profileFor } from "./profile";
import type { RenderProfile } from "./profile";
import { buildSegments, joinSegments, mouthAt } from "./speech";
import type { Segment, SpeechInput } from "./speech";

/** Layers fade out over this long after `speech` goes away. */
/** Track confidence 0..1 from the head-track residual (px): full below 7, none from 16 (the demo's gate). */
export const trackGate = (residual: number | undefined): number => (residual === undefined ? 1 : clamp01(1 - (residual - 7) / 9));
/** Eyelid pictures need at least this much track confidence. */
export const LID_TRACK_GATE = 0.6;
export const FADE_SECONDS = 0.075;
export type CompositeFrame = { clipId: string; frameIndex: number; now: number };
export type CompositeStats = { frames: number; totalMs: number; maxMs: number };

/**
 * Runs the demo's speaking pipeline on a 2D canvas that already holds the matte frame:
 * mouth (photo warp or tile morph), eyelids, head flows, emotion mix, shoulder shift.
 */
export class SpeechCompositor {
  readonly stats: CompositeStats = { frames: 0, totalMs: 0, maxMs: 0 };
  /** Milliseconds the last draw took. */
  lastMs = 0;
  private current?: SpeechInput;
  private last?: SpeechInput;
  private frozenClock = 0;
  private fade = 0;
  private lastNow?: number;
  private segs: Segment[] = [];
  private segsFor?: Cue[];
  private life?: LifeRuntime;
  private lifeFor?: SpeechInput["cues"];
  private weights = newEmotionWeights();
  private mouthState = newMouthState();
  private lidState = newLidState();
  private gate = 1;
  private profile: RenderProfile;
  private readonly frame: PackFrame;

  constructor(private readonly pack: LoadedPack, profile?: Partial<RenderProfile>, private readonly now: () => number = () => performance.now()) {
    this.profile = profileFor(pack.id, profile);
    this.frame = frameOf(pack.source);
  }

  setSpeech(speech: SpeechInput | undefined): void {
    if (speech) { this.current = speech; this.last = speech; } else this.current = undefined;
  }
  /** True while anything is drawn (speech present or still fading out). */
  get active(): boolean { return Boolean(this.current) || this.fade > 0; }
  get fadeLevel(): number { return this.fade; }

  private ensurePlan(speech: SpeechInput): void {
    if (this.segsFor !== speech.cues) {
      const next = buildSegments(speech.cues, speech.loudness, {
        drop: this.profile.dropGH, loose: this.profile.loose, route: this.profile.cadence > 0, envelope: speech.envelope,
      });
      this.segs = this.segs.length && speech.joinAt != null ? joinSegments(this.segs, next, speech.joinAt) : next;
      this.segsFor = speech.cues;
    }
    if (this.lifeFor !== speech.cues || !this.life) {
      this.life = createLifeRuntime({
        cues: speech.cues, loudness: speech.loudness, envelope: speech.envelope, events: speech.events, seed: speech.seed,
        packId: this.pack.id, poses: this.pack.head?.poses ?? [], life: this.pack.life, cadence: this.profile.cadence, frameSize: this.frame.size,
      });
      this.lifeFor = speech.cues;
    }
  }

  /** Draws one frame onto `ctx` (which already shows the matte frame). Returns false when nothing was drawn. */
  draw(ctx: CanvasRenderingContext2D, frame: CompositeFrame): boolean {
    const speech = this.current ?? this.last;
    const t0 = this.now();
    const dt = Math.min(0.1, this.lastNow === undefined ? 0 : (frame.now - this.lastNow) / 1000); this.lastNow = frame.now;
    this.fade = clamp01(this.fade + (this.current ? 1 : -1) * dt / FADE_SECONDS);
    if (this.current && this.fade === 0) this.fade = Math.min(1, 1 / 60 / FADE_SECONDS);
    if (!speech || this.fade <= 0) { if (!this.current) this.last = undefined; return false; }
    this.ensurePlan(speech);
    const clock = this.current ? speech.clock() : this.frozenClock; this.frozenClock = clock;
    const k = frameScale(ctx.canvas.width, this.frame); const track = this.pack.tracks[frame.clipId];
    const m: Affine = trackAt(track?.m, frame.frameIndex);
    const residual = track?.res?.[Math.max(0, Math.min(track.res.length - 1, Math.round(frame.frameIndex)))];
    const gateTarget = trackGate(residual);
    this.gate += (gateTarget - this.gate) * 0.5;
    const sa = this.fade;
    const life: LifeSample = this.life!.sample(clock, { emoSum: sumOf(this.weights), sa });
    const loud = life.loud;
    const emotion = chooseEmotion(speech);
    const level = this.current ? emotionLevel(emotion.kind, emotion.forced, emotion.found, loud) : 0;
    const emoSum = stepEmotionWeights(this.weights, this.current ? emotion.kind : null, level, dt * 60 || 1);
    const wantsShout = speech.voiceMode === "shout" || loud > 0.02 || life.wide;
    if (wantsShout && !this.pack.shout && this.pack.loadShout) void this.pack.loadShout();
    const set: MouthSet | undefined = wantsShout && this.pack.shout ? this.pack.shout : this.pack.calm;
    if (set) {
      const sel = mouthAt(this.segs, speech.events, clock, set, this.profile);
      drawMouth({ ctx, k, m, slot: sel.slot, amt: sa * this.gate, profile: this.profile, frame: this.frame }, set, this.mouthState);
    }
    // Where the 2D head track fits the face poorly (a 3D head turn in the clip) every picture layer fades with the track confidence,
    // and the eyelid pictures switch off: a lid pasted at a wrong place reads as a wink.
    const sure = Math.min(this.gate, gateTarget); // this frame's own confidence, not the eased one
    const trust = sa * sure;
    const fx = life.fx; if (trust < 1) for (const key of Object.keys(fx)) fx[key] = fx[key]! * trust;
    if (this.pack.eyes && emoSum <= 0.6 && sure >= LID_TRACK_GATE) {
      const lid = life.lid && sa < 1 ? { half: life.lid.half * sa, closed: life.lid.closed * sa } : life.lid;
      drawLids(ctx, k, m, this.pack.eyes, lid, this.lidState, this.profile.eyeLift, sa, this.frame);
    }
    if (this.pack.head) drawHead(ctx, k, m, this.pack.head, fx, this.frame);
    if (this.pack.emotion && emoSum > 0.004) {
      const scaled = { ...this.weights }; if (trust < 1) for (const key of Object.keys(scaled)) scaled[key as keyof typeof scaled] *= trust;
      drawEmotionMix(ctx, k, m, this.pack.emotion, scaled, this.frame);
    }
    if (Math.abs(life.shoulder * trust) > 0.12) applyShoulder(ctx, life.shoulder * trust, this.profile.shoulderBand);
    if (!this.current && this.fade <= 0) this.last = undefined;
    const ms = this.now() - t0; this.lastMs = ms; this.stats.frames++; this.stats.totalMs += ms; this.stats.maxMs = Math.max(this.stats.maxMs, ms);
    return true;
  }
}
const sumOf = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);
