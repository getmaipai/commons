import type { Cue } from "./cues";
import { loudMean, promoteLoud } from "./loud";
import { mixSlot, activeVocal, vocalMouth } from "./tags";
import type { EventWindow, MouthMix, MorphMix } from "./tags";
import type { RenderProfile } from "./profile";

export type EmotionName = "angry" | "excited" | "alarmed" | "sad";
export type VoiceMode = "normal" | "shout";
/** What the player needs to animate one spoken line. `clock` is the audio clock in seconds since the first sample. */
export type SpeechInput = {
  cues: Cue[];
  loudness: Float32Array;
  events: EventWindow[];
  /** A kind forces that emotion (level floor 0.7); null or "none" turns it off; "auto" or undefined reads `text`. */
  emotion?: EmotionName | "auto" | "none" | null;
  voiceMode?: VoiceMode;
  clock: () => number;
  /** 100 Hz normalised voice envelope, used by the life planners (the loudness track is used when absent). */
  envelope?: Float32Array;
  text?: string;
  tags?: string[];
  seed?: number;
  /** Time (s) where provisional cues were replaced by final ones; segments already started keep their shape. */
  joinAt?: number;
};

export type Segment = { s: number; t0: number; t1: number; w: number; mbp?: boolean };
export type SegmentOptions = { drop: boolean; loose: boolean; route: boolean; win?: number; envelope?: Float32Array };
const LETTERS = "ABCDEFGH";
const isMbp = (cue: Cue) => cue.l === "A" && cue.p.length === 1 && "MBP".includes(cue.p);
const mean = (values: Float32Array, a: number, b: number): number => {
  let sum = 0; let n = 0;
  for (let i = Math.floor(a * 100); i < Math.min(values.length, Math.ceil(b * 100)); i++) { sum += values[i]!; n++; }
  return n ? sum / n : 0.5;
};

/**
 * Cue letters to shape segments (demo buildSegments): shout promotion, G/H folding, merges of too-short shapes,
 * stop-motion routing and per-segment transition windows. The D-percentile rules need the envelope and run only
 * when one is given (PACK-04 buildCues has already applied them).
 */
export function buildSegments(cues: Cue[], loudness: Float32Array, options: SegmentOptions): Segment[] {
  if (!cues.length) return [];
  const { drop, loose, route, envelope } = options; let win = options.win ?? 0.12;
  const sorted = envelope ? Array.from(envelope).sort((a, b) => a - b) : [];
  const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? 1; const p40 = sorted[Math.floor(sorted.length * 0.4)] ?? 0.3;
  const lastEnd = cues[cues.length - 1]!.t1; const span = Math.max(0.5, lastEnd - cues[0]!.t0);
  const fast = cues.filter((cue) => "CDEFH".includes(cue.l) && cue.p !== "_").length / span > 4.2;
  if (fast) win = Math.min(win, 0.07);
  let lastD = -9; const list: Segment[] = [];
  for (const cue of cues) {
    let l: string = cue.l; const dur = cue.t1 - cue.t0;
    if (l === "A") {
      if (!isMbp(cue) && dur < 0.15 && cue.t0 > 0.05 && cue.t1 < lastEnd - 0.05) l = "B";
    } else if (envelope && l === "D") {
      if (mean(envelope, cue.t0, cue.t1) >= p75 && !(lastD > -9 && cue.t0 - lastD < 0.7)) { lastD = cue.t0; } else l = "C";
    } else if (envelope && l === "C" && (cue.p === "AH" || cue.p === "ER" || cue.p === "EH" || mean(envelope, cue.t0, cue.t1) < p40)) l = "B";
    const loud = cue.p !== "_" ? loudMean(loudness, cue.t0, cue.t1) : 0; let shoutH = false;
    if (loud >= 0.35) {
      l = promoteLoud(l as Cue["l"], loud);
      if (drop && (l === "D" || (l === "C" && loud >= 0.55))) { l = "H"; shoutH = true; }
    }
    if (drop && !shoutH) l = l === "G" ? "B" : l === "H" ? "C" : l;
    const s = LETTERS.indexOf(l); const last = list[list.length - 1];
    if (last && last.s === s) last.t1 = cue.t1; else list.push({ s, t0: cue.t0, t1: cue.t1, w: 0, mbp: l === "A" && isMbp(cue) });
  }
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (let i = 0; i < list.length; i++) {
      const g = list[i]!; const prev = list[i - 1]; const next = list[i + 1];
      const soft = (g.s === 1 || g.s === 2) && ((prev && (prev.s === 1 || prev.s === 2)) || (next && (next.s === 1 || next.s === 2)));
      const threshold = (fast ? 0.6 : 1) * (g.mbp ? (loose ? 0.05 : 0.07) : soft ? (loose ? 0.14 : 0.22) : (loose ? 0.1 : 0.14));
      if (g.t1 - g.t0 >= threshold || list.length < 2) continue;
      const target = !prev ? next : !next ? prev : ((prev.t1 - prev.t0) >= (next.t1 - next.t0) ? prev : next);
      if (target === prev) prev!.t1 = g.t1; else next!.t0 = g.t0;
      list.splice(i, 1); changed = true; break;
    }
    if (!changed) break;
  }
  let segs: Segment[] = [];
  for (const g of list) { const last = segs[segs.length - 1]; if (last && last.s === g.s) last.t1 = g.t1; else segs.push({ ...g }); }
  if (route) {
    const routed = [segs[0]!];
    for (let i = 1; i < segs.length; i++) {
      const a = segs[i - 1]!.s; const b = segs[i]!.s;
      const big = a !== b && ((a === 0 && b > 1) || (b === 0 && a > 1) || (a > 1 && b > 1));
      if (big && segs[i]!.t1 - segs[i]!.t0 > 0.13) { routed.push({ s: 1, t0: segs[i]!.t0, t1: segs[i]!.t0 + 0.07, w: 0 }); segs[i]!.t0 += 0.07; }
      routed.push(segs[i]!);
    }
    segs = routed;
  }
  for (let i = 1; i < segs.length; i++) { segs[i]!.t0 = Math.max(segs[i]!.t0, segs[i - 1]!.t0 + 0.02); segs[i - 1]!.t1 = segs[i]!.t0; }
  segs.forEach((g, i) => { g.w = route || i === 0 ? 0 : Math.max(0, Math.min(win, 0.9 * Math.min(g.t1 - g.t0, segs[i - 1]!.t1 - segs[i - 1]!.t0))); });
  if (loudness.some((v) => v > 0)) { // loud passages: open shapes held up to 400 ms and 60 ms transitions
    for (let i = 0; i < segs.length; i++) {
      const g = segs[i]!;
      if (loudMean(loudness, g.t0, g.t1) < 0.35) continue;
      if (i > 0) g.w = Math.min(g.w, 0.06);
      const next = segs[i + 1];
      if (next && [2, 3, 7].includes(g.s) && next.s !== 0) {
        const ext = Math.min(0.4 - (g.t1 - g.t0), (next.t1 - next.t0) - 0.1);
        if (ext > 0.01) { g.t1 += ext; next.t0 += ext; next.w = Math.min(next.w, 0.06, 0.9 * Math.min(next.t1 - next.t0, g.t1 - g.t0)); }
      }
    }
  }
  return segs;
}

/** Provisional to final cues: segments already started stay as drawn, later ones follow the real timing. */
export function joinSegments(old: Segment[], next: Segment[], joinAt: number): Segment[] {
  const head = old.filter((g) => g.t0 < joinAt).map((g) => ({ ...g }));
  const tail = next.filter((g) => g.t0 >= joinAt + 0.02).map((g) => ({ ...g }));
  if (head.length) head[head.length - 1]!.t1 = tail.length ? tail[0]!.t0 : head[head.length - 1]!.t1;
  const merged = head.concat(tail);
  merged.forEach((g, i) => { if (i > 0 && i === head.length) g.w = Math.min(0.08, 0.9 * Math.min(g.t1 - g.t0, merged[i - 1]!.t1 - merged[i - 1]!.t0)); });
  return merged;
}

/** The mouth shape (and baked in-between tile) for audio time `time` (demo shapeAt without the vocal override). */
export function segmentShape(segs: Segment[], time: number, morph: MorphMix, early: boolean): MouthMix {
  if (!segs.length || time < 0) return { l: "A", slot: 0 };
  let cur = 0;
  for (let i = 0; i < segs.length; i++) { if (time >= segs[i]!.t0) cur = i; else break; }
  for (let i = Math.max(1, cur - 1); i <= Math.min(segs.length - 1, cur + 1); i++) {
    const g = segs[i]!; const start = early ? g.t0 - g.w : g.t0 - g.w / 2;
    if (g.w > 0 && time >= start && time < start + g.w) {
      let p = (time - start) / g.w; p = p * p * (3 - 2 * p);
      const from = segs[i - 1]!.s;
      if (from === g.s) break;
      return mixSlot(morph, from, g.s, p);
    }
  }
  const s = segs[cur]?.s ?? 0;
  return { l: LETTERS[s]!, slot: s };
}

/** Snaps a clock to a stop-motion tick. */
export const tickTime = (clock: number, cadence: number): number => cadence ? Math.floor(Math.max(0, clock + 0.04) * cadence) / cadence : clock;

/** Full mouth choice: vocal events (laugh, cough, gasp, sigh, clear throat) first, then the cue segments. */
export function mouthAt(segs: Segment[], events: EventWindow[], clock: number, morph: MorphMix, profile: RenderProfile): MouthMix {
  const time = tickTime(clock, profile.cadence);
  if (time < 0) return { l: "A", slot: 0 };
  const event = activeVocal(events, time);
  if (event) { const mix = vocalMouth(event, time, morph)?.mix; if (mix) return mix; }
  return segmentShape(segs, time, morph, profile.early);
}
