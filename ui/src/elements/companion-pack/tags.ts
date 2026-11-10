import {
  AUDIO_F0_MAX, AUDIO_F0_MIN, AUDIO_HARMONICITY_CUTOFF, AUDIO_NOISE_FLOOR,
  AUDIO_WINDOW_SECONDS, EVENT_GAP_FRAMES, EVENT_MIN_FRAMES, EVENT_PRIOR_WINDOW_SECONDS,
  FRAME_SECONDS, GASP_POST_ROLL, NOM, TAG_MAX_SECONDS, TAG_RE_SOURCE,
  UNIT_S, VOCAL_POST_ROLL, VOCAL_PRE_ROLL,
} from "./constants";
import type { PhonesFor } from "./cues";

export type VocalTag = { type: string; wordIdx: number; charIdx: number };
export type EventWindow = {
  type: string; t0: number; t1: number; src: "audio" | "text"; tagIdx: number;
  peaks?: number[]; peakAmp?: number[]; te?: number;
};
export type AudioFeatures = { rms: Float32Array; har: Float32Array; hi: Float32Array; n: number };
export const TAG_RE = new RegExp(TAG_RE_SOURCE, "gi");

export function splitTags(text: string): { plain: string; tags: VocalTag[] } {
  const tags: VocalTag[] = []; let plain = ""; let last = 0; let match: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(text)) !== null) {
    plain += text.slice(last, match.index);
    const wordIdx = plain.toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean).length;
    tags.push({ type: match[1]!.toLowerCase(), wordIdx, charIdx: plain.length });
    last = match.index + match[0].length;
  }
  plain += text.slice(last);
  return { plain, tags };
}

/** Demo audioFeatures: 10 ms RMS, normalized autocorrelation and high-band ratio. */
export function audioFeatures(samples: Float32Array, sampleRate: number): AudioFeatures {
  const decimated = new Float32Array(samples.length >> 1);
  for (let i = 0; i < decimated.length; i++) decimated[i] = 0.5 * (samples[2 * i]! + samples[2 * i + 1]!);
  const halfRate = sampleRate / 2;
  const hop = Math.round(sampleRate * FRAME_SECONDS);
  const halfHop = hop >> 1;
  const n = Math.floor(samples.length / hop);
  const rms = new Float32Array(n); const har = new Float32Array(n); const hi = new Float32Array(n);
  const window = Math.round(halfRate * AUDIO_WINDOW_SECONDS);
  const minLag = Math.round(halfRate / AUDIO_F0_MAX); const maxLag = Math.round(halfRate / AUDIO_F0_MIN);
  for (let i = 0; i < n; i++) {
    let energy = 0; let difference = 0;
    for (let j = i * hop; j < Math.min(samples.length - 1, (i + 1) * hop); j++) {
      energy += samples[j]! ** 2;
      const delta = samples[j + 1]! - samples[j]!; difference += delta * delta;
    }
    rms[i] = Math.sqrt(energy / hop);
    hi[i] = difference / Math.max(1e-9, 4 * energy);
    if (rms[i]! < 1e-4) continue;
    const center = i * halfHop + (halfHop >> 1);
    const start = Math.max(0, center - (window >> 1));
    const end = Math.min(decimated.length - maxLag - 1, start + window);
    if (end - start < window / 2) continue;
    let energy0 = 0;
    for (let j = start; j < end; j++) energy0 += decimated[j]! ** 2;
    let best = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let product = 0; let energy1 = 0;
      for (let j = start; j < end; j++) {
        product += decimated[j]! * decimated[j + lag]!;
        energy1 += decimated[j + lag]! ** 2;
      }
      best = Math.max(best, product / Math.sqrt(Math.max(1e-12, energy0 * energy1)));
    }
    har[i] = best;
  }
  const median = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const neighbors = [har[Math.max(0, i - 1)]!, har[i]!, har[Math.min(n - 1, i + 1)]!].sort((a, b) => a - b);
    median[i] = neighbors[1]!;
  }
  return { rms, har: median, hi, n };
}

function wordWeights(text: string, phonesFor: PhonesFor): number[] {
  const words = text.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
  return words.map((word) => (phonesFor(word) ?? [...word].map(() => "T"))
    .reduce((sum, phone) => sum + (/[AEIOU]/.test(phone[0] ?? "") ? 1 : 0.6), 0) + 0.6);
}

function smoothedRms(rms: Float32Array, index: number): number {
  return (rms[index - 1] ?? rms[index]!) / 3 + rms[index]! / 3 + (rms[index + 1] ?? rms[index]!) / 3;
}

/** Demo detectEvents. Text timing is the prior; audio candidates must lie within ±0.6 s. */
export function detectEvents(
  samples: Float32Array, sampleRate: number, plain: string, tags: VocalTag[], phonesFor: PhonesFor,
): EventWindow[] {
  if (!tags.length) return [];
  if (samples.length < sampleRate * 0.1) {
    const weights = wordWeights(plain, phonesFor);
    const tagWeights = tags.map((tag) => (NOM[tag.type] ?? 0.6) / UNIT_S);
    const total = weights.reduce((a, b) => a + b, 0) + tagWeights.reduce((a, b) => a + b, 0);
    const span = samples.length / sampleRate;
    return tags.map((tag, tagIdx) => {
      const before = weights.slice(0, tag.wordIdx).reduce((a, b) => a + b, 0)
        + tagWeights.slice(0, tagIdx).reduce((a, b) => a + b, 0);
      const expected = total ? span * (before + 0.5 * tagWeights[tagIdx]!) / total : span / 2;
      const nominal = NOM[tag.type] ?? 0.6;
      return { type: tag.type, t0: Math.max(0, expected - nominal / 2), t1: expected + nominal / 2,
        src: "text" as const, tagIdx, te: expected };
    });
  }
  const features = audioFeatures(samples, sampleRate); const { rms, har, n } = features;
  const sorted = [...rms].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(n * 0.95)] || 1e-6; const threshold = 0.035 * p95;
  let voicedStart = 0; while (voicedStart < n && rms[voicedStart]! < threshold) voicedStart++;
  let voicedEnd = n - 1; while (voicedEnd > voicedStart && rms[voicedEnd]! < threshold) voicedEnd--;
  const harmonicity = new Float32Array(n); const noisy = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0; let count = 0;
    for (let k = -3; k <= 3; k++) if (har[i + k] !== undefined) { sum += har[i + k]!; count++; }
    harmonicity[i] = sum / count;
    noisy[i] = rms[i]! >= AUDIO_NOISE_FLOOR * p95 && harmonicity[i]! < AUDIO_HARMONICITY_CUTOFF ? 1 : 0;
  }
  const runs: [number, number][] = [];
  for (let i = 0; i < n; i++) if (noisy[i]) {
    let j = i; let gap = 0; let end = i;
    while (j < n && gap <= EVENT_GAP_FRAMES) {
      if (noisy[j]) { end = j; gap = 0; } else gap++;
      j++;
    }
    if (end - i + 1 >= EVENT_MIN_FRAMES) runs.push([i, end]);
    i = end;
  }
  const weights = wordWeights(plain, phonesFor);
  const tagWeights = tags.map((tag) => (NOM[tag.type] ?? 0.6) / UNIT_S);
  const total = weights.reduce((a, b) => a + b, 0) + tagWeights.reduce((a, b) => a + b, 0);
  let previousEnd = -1;
  return tags.map((tag, tagIdx) => {
    const before = weights.slice(0, tag.wordIdx).reduce((a, b) => a + b, 0)
      + tagWeights.slice(0, tagIdx).reduce((a, b) => a + b, 0);
    const expected = voicedStart + (voicedEnd - voicedStart) * (before + 0.5 * tagWeights[tagIdx]!) / Math.max(1e-9, total);
    let best: [number, number] | undefined; let bestCost = Infinity;
    for (const run of runs) {
      if (run[0] < previousEnd - 2) continue;
      const center = (run[0] + run[1]) / 2;
      const distance = Math.abs(center - expected);
      if (distance > EVENT_PRIOR_WINDOW_SECONDS / FRAME_SECONDS) continue;
      const cost = distance - 0.4 * (run[1] - run[0] + 1);
      if (cost < bestCost) { best = run; bestCost = cost; }
    }
    const nominal = NOM[tag.type] ?? 0.6;
    let event: EventWindow;
    if (best) {
      const start = best[0]; const end = Math.min(best[1], start + Math.round((TAG_MAX_SECONDS[tag.type] ?? nominal) / FRAME_SECONDS));
      event = { type: tag.type, t0: start * FRAME_SECONDS, t1: (end + 1) * FRAME_SECONDS, src: "audio", tagIdx };
    } else {
      event = { type: tag.type, t0: Math.max(0, expected * FRAME_SECONDS - nominal / 2),
        t1: expected * FRAME_SECONDS + nominal / 2, src: "text", tagIdx };
    }
    previousEnd = Math.round(event.t1 / FRAME_SECONDS); event.te = expected * FRAME_SECONDS;
    const first = Math.round(event.t0 / FRAME_SECONDS); const last = Math.round(event.t1 / FRAME_SECONDS);
    let peakMax = 0;
    for (let i = first; i < last; i++) peakMax = Math.max(peakMax, smoothedRms(rms, i));
    const gap = tag.type === "cough" || tag.type === "clear throat" ? 5 : 11;
    const peaks: [number, number][] = [];
    for (let i = first + 1; i < last - 1; i++) {
      const value = smoothedRms(rms, i);
      if (value <= 0.3 * peakMax || value < smoothedRms(rms, i - 1) || value < smoothedRms(rms, i + 1)) continue;
      if (peaks.length && i - peaks[peaks.length - 1]![0] < gap) {
        if (value > peaks[peaks.length - 1]![1]) peaks[peaks.length - 1] = [i, value];
      } else peaks.push([i, value]);
    }
    const limit = tag.type === "cough" || tag.type === "clear throat" ? 2 : 8;
    event.peaks = peaks.slice(0, limit).map(([frame]) => frame * FRAME_SECONDS);
    event.peakAmp = peaks.slice(0, 8).map(([, value]) => value / Math.max(1e-6, peakMax));
    return event;
  });
}

export type MouthMix = { l: string; slot: number; between?: boolean };
export type MorphMix = { base: number; ts: number[] };
export function mixSlot(morph: MorphMix, from: number, to: number, progress: number): MouthMix {
  if (progress <= 0.08 || from === to) return { l: "ABCDEFGH"[from]!, slot: from };
  if (progress >= 0.92) return { l: "ABCDEFGH"[to]!, slot: to };
  let index = 0; let distance = 9;
  morph.ts.forEach((value, i) => { const delta = Math.abs(value - progress); if (delta < distance) { distance = delta; index = i; } });
  return { l: "ABCDEFGH"[to]!, slot: morph.base + (from * 8 + to) * morph.ts.length + index, between: true };
}

export function activeVocal(events: EventWindow[], time: number): EventWindow | null {
  return events.find((event) => time >= event.t0 - VOCAL_PRE_ROLL
    && time < event.t1 + VOCAL_POST_ROLL + (event.type === "gasp" ? GASP_POST_ROLL : 0)) ?? null;
}

function smooth3(value: number): number { return value <= 0 ? 0 : value >= 1 ? 1 : value * value * (3 - 2 * value); }
function pulse(time: number, center: number, width: number): number {
  const u = (time - center + width / 2) / width;
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2;
}

/** Returns demo vocalMouth's categorical target and interpolation progress. */
export function vocalMouth(
  event: EventWindow, time: number, morph?: MorphMix,
): { from: number; to: number; progress: number; mix?: MouthMix } | null {
  const start = event.t0; const end = event.t1; const duration = end - start; const u = time - start;
  const ease = (from: number, to: number, p: number) => {
    const progress = Math.max(0, Math.min(1, p));
    return { from, to, progress, ...(morph ? { mix: mixSlot(morph, from, to, progress) } : {}) };
  };
  const peaks = event.peaks?.length ? event.peaks : undefined;
  if (event.type === "laugh" || event.type === "chuckle") {
    const width = event.type === "laugh" ? 0.16 : 0.12; const top = event.type === "laugh" ? 3 : 2;
    const pulseTimes = peaks ?? Array.from({ length: Math.max(1, Math.round(duration * 5)) }, (_, i) => start + (i + 0.5) / 5);
    const movement = pulseTimes.reduce((max, peak) => Math.max(max, pulse(time, peak, width)), 0);
    if (time > end) return ease(1, 0, smooth3((time - end) / 0.1));
    return ease(1, top, smooth3(u / 0.06) * (0.3 + 0.7 * movement));
  }
  if (event.type === "cough") {
    const pulseTimes = peaks ?? [start + 0.05];
    for (let i = 0; i < pulseTimes.length; i++) {
      const peak = pulseTimes[i]!;
      if (time > peak - 0.06 && time < peak + 0.1) return ease(0, i ? 2 : 3, pulse(time, peak, 0.16) * (i ? 0.7 : 1));
    }
    return ease(0, 0, 0);
  }
  if (event.type === "gasp") {
    const hold = Math.max(end, start + 0.4);
    return time > hold ? ease(4, 0, smooth3((time - hold) / 0.12)) : ease(0, 4, smooth3((time - (start - 0.03)) / 0.07));
  }
  if (event.type === "sigh") {
    return time > end ? ease(4, 0, smooth3((time - end) / 0.12)) : ease(0, 4, 0.7 * smooth3(u / 0.2));
  }
  if (event.type === "clear throat") {
    const pulseTimes = peaks ?? [start + 0.1];
    const movement = pulseTimes.reduce((max, peak) => Math.max(max, pulse(time, peak, 0.1)), 0);
    return ease(0, 1, movement);
  }
  return null;
}

/** Big sigh motion is intentionally tied to the source text tag, never audio inference. */
export function hasTaggedSigh(tags: VocalTag[], event: EventWindow): boolean {
  return event.type === "sigh" && tags[event.tagIdx]?.type === "sigh";
}
