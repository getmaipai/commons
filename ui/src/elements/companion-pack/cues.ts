import {
  D_PERCENTILE, D_REPEAT_SECONDS, ENVELOPE_SMOOTH_FRAMES, FAST_SCALE, FAST_TRANSITION_SECONDS,
  FAST_VOWELS_PER_SECOND,
  FRAME_SECONDS, MBP_MERGE_SECONDS, NORMAL_TRANSITION_SECONDS, PAUSE_CLOSE_SECONDS,
  SEGMENT_MERGE_SECONDS, SOFT_MERGE_SECONDS, UNIT_S, VALLEY_MARGIN_FRAMES,
  VALLEY_RADIUS_FRAMES, VOICED_FLOOR, WEAK_HOLD_SECONDS, WORD_GAP_WEIGHT,
} from "./constants";

export type MouthLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type Cue = { l: MouthLetter; t0: number; t1: number; p: string };
export type PhonesFor = (word: string) => string[] | null;
export type EnvelopeWord = { w: string; ph: string[] };
const VOWELS = new Set(["UW", "UH", "OW", "AO", "OY", "AA", "AW", "AY", "AE", "EH", "AH", "ER", "IY", "IH", "EY"]);
const VIS: Record<string, MouthLetter> = {
  M: "A", B: "A", P: "A", F: "G", V: "G", L: "H", TH: "H", DH: "H", W: "F",
  UW: "F", UH: "F", OW: "E", AO: "E", OY: "E", AA: "D", AW: "D", AY: "D",
  AE: "C", EH: "C", AH: "C", ER: "C", IY: "B", IH: "B", EY: "B", K: "B",
  G: "B", N: "B", T: "B", D: "B", S: "B", Z: "B", SH: "B", CH: "B",
  JH: "B", ZH: "B", NG: "B", Y: "B", HH: "C", R: "C",
};
const FALLBACK: Record<string, string> = {
  a: "AE", e: "EH", i: "IH", o: "OW", u: "AH", b: "B", p: "P", m: "M",
  f: "F", v: "V", l: "L", w: "W", r: "R",
};
const weight = (phone: string): number => VOWELS.has(phone) ? 1
  : ("PBMTDKG".includes(phone[0] ?? "") && phone.length === 1) ? 0.45 : 0.6;
const letterPhones = (word: string): string[] => [...word.toLowerCase()]
  .filter((char) => /[a-z]/.test(char)).map((char) => FALLBACK[char] ?? "T");
const wordsFromText = (text: string, phonesFor: PhonesFor): { word: string; phones: string[] }[] =>
  text.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' ]+/g, " ").split(/\s+/)
    .filter(Boolean).map((word) => ({ word, phones: phonesFor(word) ?? letterPhones(word) }));

function rmsEnvelope(samples: Float32Array, sampleRate: number): Float32Array {
  const step = Math.max(1, Math.floor(sampleRate * FRAME_SECONDS));
  const raw = new Float32Array(Math.floor(samples.length / step));
  for (let i = 0; i < raw.length; i++) {
    let sum = 0;
    for (let j = i * step; j < Math.min(samples.length, (i + 1) * step); j++) sum += samples[j]! ** 2;
    raw[i] = Math.sqrt(sum / step);
  }
  const smooth = raw.map((_, i) => {
    let sum = 0; let count = 0;
    for (let k = -ENVELOPE_SMOOTH_FRAMES; k <= ENVELOPE_SMOOTH_FRAMES; k++) {
      if (raw[i + k] !== undefined) { sum += raw[i + k]!; count++; }
    }
    return sum / count;
  });
  const sorted = [...smooth].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1e-6;
  return smooth.map((value) => value / p95);
}

function wordCues(words: { word: string; phones: string[] }[], env: Float32Array, a: number, b: number, flat = false): Cue[] {
  if (!words.length) return [];
  const totals = words.map(({ phones }) => phones.reduce((sum, phone) => sum + weight(phone), 0) + WORD_GAP_WEIGHT);
  const allWeight = totals.reduce((sum, value) => sum + value, 0);
  const bounds = [a]; let accumulated = 0;
  for (let i = 0; i < words.length - 1; i++) {
    accumulated += totals[i]!;
    const center = Math.round(a + (b - a) * accumulated / allWeight);
    let best = center; let lowest = 9;
    for (let offset = flat ? 0 : -VALLEY_RADIUS_FRAMES; offset <= (flat ? 0 : VALLEY_RADIUS_FRAMES); offset++) {
      const frame = center + offset;
      if (frame > bounds[bounds.length - 1]! + (flat ? 0 : VALLEY_MARGIN_FRAMES) && frame < b - (flat ? 0 : VALLEY_MARGIN_FRAMES) && env[frame]! < lowest) {
        best = frame; lowest = env[frame]!;
      }
    }
    bounds.push(best);
  }
  bounds.push(b);
  const cues: Cue[] = [];
  words.forEach(({ phones }, i) => {
    const start = bounds[i]! * FRAME_SECONDS; const end = bounds[i + 1]! * FRAME_SECONDS;
    const weights = phones.map(weight); const sum = weights.reduce((x, y) => x + y, 0);
    let time = start;
    phones.forEach((phone, index) => {
      const duration = (end - start) * 0.92 * weights[index]! / sum;
      cues.push({ l: VIS[phone] ?? "B", p: phone, t0: time, t1: time + duration }); time += duration;
    });
    cues.push({ l: "A", p: "_", t0: time, t1: end });
  });
  return cues;
}

/** Align supplied demo phonemes to a precomputed 10 ms envelope. */
export function cuesFromEnvelope(input: {
  text: string; env: Float32Array; phonesFor: PhonesFor; fast?: boolean; flat?: boolean;
}): Cue[] {
  const words = wordsFromText(input.text, input.phonesFor);
  if (!words.length || !input.env.length) return [];
  let a = 0; let b = input.env.length - 1;
  while (a < input.env.length && input.env[a]! < VOICED_FLOOR) a++;
  while (b > a && input.env[b]! < VOICED_FLOOR) b--;
  const aligned = wordCues(words, input.env, a, b, input.flat ?? false);
  const vowelsPerSecond = words.reduce((sum, word) => sum + word.phones.filter((phone) => VOWELS.has(phone)).length, 0)
    / Math.max(0.5, (b - a) * FRAME_SECONDS);
  // buildCues returns phoneme-aligned cues; fast mode is consumed by segment shaping.
  void (input.fast ?? vowelsPerSecond > FAST_VOWELS_PER_SECOND);
  return aligned;
}

function normalize(cues: Cue[], env: Float32Array, fast: boolean, loudness?: Float32Array): Cue[] {
  const sorted = [...env].sort((a, b) => a - b);
  const p75 = sorted[Math.floor(sorted.length * D_PERCENTILE)] ?? 1;
  let lastD = -Infinity;
  const shaped: Cue[] = [];
  const end = cues[cues.length - 1]?.t1 ?? 0;
  for (const cue of cues) {
    let letter = cue.l;
    const startFrame = Math.floor(cue.t0 / FRAME_SECONDS);
    const endFrame = Math.min(env.length, Math.ceil(cue.t1 / FRAME_SECONDS));
    const mean = Array.from(env.slice(startFrame, endFrame)).reduce((a, b) => a + b, 0) / Math.max(1, endFrame - startFrame);
    const duration = cue.t1 - cue.t0;
    if (letter === "A") {
      const closure = ["M", "B", "P"].includes(cue.p);
      letter = closure || duration < PAUSE_CLOSE_SECONDS ? "A" : "A";
    } else if (letter === "D") {
      if (mean >= p75 && cue.t0 - lastD >= D_REPEAT_SECONDS) lastD = cue.t0;
      else letter = "C";
    } else if (letter === "C" && (["AH", "ER", "EH"].includes(cue.p) || mean < 0.3)) letter = "B";
    const loud = loudness?.[Math.floor(cue.t0 / FRAME_SECONDS)] ?? 0;
    if (loud >= 0.8 && "BCDE".includes(letter) && cue.p !== "_") letter = "D";
    else if (loud >= 0.5 && letter === "B" && cue.p !== "_") letter = "C";
    else if (loud >= 0.5 && letter === "C" && cue.p !== "_") letter = "D";
    if (letter === "C" && mean >= p75) letter = "D";
    if (letter === "D" && cue.t0 - lastD < D_REPEAT_SECONDS && lastD !== cue.t0) letter = "C";
    if ((cue.p === "AH" || cue.p === "ER" || cue.p === "EH") && letter !== "A") letter = "B";
    if (cue.p === "_" && duration < WEAK_HOLD_SECONDS && cue.t0 > 0.05 && cue.t1 < end - 0.05) letter = "B";
    const previous = shaped[shaped.length - 1];
    if (previous?.l === letter) previous.t1 = cue.t1;
    else shaped.push({ ...cue, l: letter });
  }
  const scale = fast ? FAST_SCALE : 1;
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (let i = 0; i < shaped.length; i++) {
      const item = shaped[i]!; const prev = shaped[i - 1]; const next = shaped[i + 1];
      const soft = ["B", "C"].includes(item.l) && (!!prev && ["B", "C"].includes(prev.l) || !!next && ["B", "C"].includes(next.l));
      const threshold = scale * (item.p !== "_" && ["M", "B", "P"].includes(item.p)
        ? MBP_MERGE_SECONDS : soft ? SOFT_MERGE_SECONDS : SEGMENT_MERGE_SECONDS);
      if (item.t1 - item.t0 >= threshold || shaped.length < 2) continue;
      const target = !prev ? next : !next ? prev
        : (prev.t1 - prev.t0 >= next.t1 - next.t0 ? prev : next);
      if (target === prev) prev!.t1 = item.t1; else next!.t0 = item.t0;
      shaped.splice(i, 1); changed = true; break;
    }
    if (!changed) break;
  }
  const transition = fast ? FAST_TRANSITION_SECONDS : NORMAL_TRANSITION_SECONDS;
  for (let i = 1; i < shaped.length; i++) {
    const boundary = Math.max(shaped[i]!.t0, shaped[i - 1]!.t0 + transition * 0.15);
    shaped[i]!.t0 = boundary; shaped[i - 1]!.t1 = boundary;
  }
  return shaped;
}

export function buildCues(input: {
  text: string; samples: Float32Array; sampleRate: number; phonesFor: PhonesFor;
  fast?: boolean; loud?: Float32Array | boolean;
}): Cue[] {
  const env = rmsEnvelope(input.samples, input.sampleRate);
  const words = wordsFromText(input.text, input.phonesFor);
  let a = 0; let b = env.length - 1;
  while (a < env.length && env[a]! < VOICED_FLOOR) a++;
  while (b > a && env[b]! < VOICED_FLOOR) b--;
  const base = wordCues(words, env, a, b);
  const vowelCount = base.filter((cue) => VOWELS.has(cue.p)).length;
  const autoFast = vowelCount / Math.max(0.5, (b - a) * FRAME_SECONDS) > 4.2;
  const loud = input.loud instanceof Float32Array ? input.loud : undefined;
  return normalize(base, env, input.fast ?? autoFast, loud);
}

export function provisionalCues(text: string, phonesFor: PhonesFor): Cue[] {
  let time = 0; const cues: Cue[] = [];
  for (const { phones } of wordsFromText(text, phonesFor)) {
    for (const phone of phones) {
      const duration = weight(phone) * UNIT_S;
      cues.push({ l: VIS[phone] ?? "B", p: phone, t0: time, t1: time + duration }); time += duration;
    }
    cues.push({ l: "A", p: "_", t0: time, t1: time + WORD_GAP_WEIGHT * UNIT_S }); time += WORD_GAP_WEIGHT * UNIT_S;
  }
  return cues;
}

export function joinCues(provisional: Cue[], final: Cue[], joinAt: number): Cue[] {
  const head = provisional.filter((cue) => cue.t0 < joinAt).map((cue) => ({
    ...cue, t1: cue.t1 > joinAt ? joinAt : cue.t1,
  }));
  const tail = final.filter((cue) => cue.t0 >= joinAt + 0.02).map((cue) => ({ ...cue }));
  return [...head, ...tail];
}
