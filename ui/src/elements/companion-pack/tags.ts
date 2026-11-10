import { FRAME_SECONDS, TAG_MAX_SECONDS, TAG_PRIORS, UNIT_S } from "./constants";
import type { PhonesFor } from "./cues";

export type VocalTag = { type: string; wordIdx: number; charIdx: number };
export type EventWindow = { type: string; t0: number; t1: number; src: "audio" | "text"; tagIdx: number };
const TAG_RE = /\[(laugh|chuckle|cough|sigh|clear throat|gasp)\]/gi;

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

export function detectEvents(
  samples: Float32Array, sampleRate: number, plain: string, tags: VocalTag[], phonesFor: PhonesFor,
): EventWindow[] {
  if (!tags.length) return [];
  const frames = Math.floor(samples.length / (sampleRate * FRAME_SECONDS));
  const rms = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let square = 0; const start = Math.floor(i * sampleRate * FRAME_SECONDS);
    for (let j = start; j < Math.min(samples.length, start + sampleRate * FRAME_SECONDS); j++) square += samples[j]! ** 2;
    rms[i] = Math.sqrt(square / Math.max(1, Math.floor(sampleRate * FRAME_SECONDS)));
  }
  const sorted = [...rms].sort((a, b) => a - b); const floor = (sorted[Math.floor(frames * 0.95)] ?? 1e-6) * 0.035;
  const runs: [number, number][] = []; let start = -1;
  for (let i = 0; i <= frames; i++) {
    if (i < frames && rms[i]! >= floor) { if (start < 0) start = i; }
    else if (start >= 0) { if (i - start >= 12) runs.push([start, i - 1]); start = -1; }
  }
  const words = plain.toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
  const units = words.map((word) => (phonesFor(word) ?? [...word].map(() => "T"))
    .reduce((sum, phone) => sum + (/[AEIOU]/.test(phone[0] ?? "") ? 1 : 0.6), 0) + 0.6);
  const tagUnits = tags.map((tag) => (TAG_PRIORS[tag.type] ?? 0.6) / UNIT_S);
  const total = units.reduce((a, b) => a + b, 0) + tagUnits.reduce((a, b) => a + b, 0);
  let prior = 0; let previousEnd = -1;
  return tags.map((tag, tagIdx) => {
    const before = units.slice(0, tag.wordIdx).reduce((a, b) => a + b, 0) + tagUnits.slice(0, tagIdx).reduce((a, b) => a + b, 0);
    const expected = total ? (frames * before + frames * tagUnits[tagIdx]! * 0.5) / total : frames * 0.5;
    const candidates = runs.filter(([a, b]) => a >= previousEnd - 2 && Math.abs((a + b) / 2 - expected) < 60);
    const best = candidates.sort((a, b) => Math.abs((a[0] + a[1]) / 2 - expected) - Math.abs((b[0] + b[1]) / 2 - expected))[0];
    const nominal = TAG_PRIORS[tag.type] ?? 0.6;
    const audioEnd = best
      ? Math.min(best[1] + 1, best[0] + Math.round((TAG_MAX_SECONDS[tag.type] ?? nominal) / FRAME_SECONDS))
      : 0;
    const window: EventWindow = best
      ? {
        type: tag.type, t0: best[0] * FRAME_SECONDS, t1: audioEnd * FRAME_SECONDS,
        src: "audio", tagIdx,
      }
      : { type: tag.type, t0: Math.max(0, expected * FRAME_SECONDS - nominal / 2), t1: expected * FRAME_SECONDS + nominal / 2, src: "text", tagIdx };
    previousEnd = Math.round(window.t1 / FRAME_SECONDS); prior = expected;
    void prior;
    return window;
  });
}
