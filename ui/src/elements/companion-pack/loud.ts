import {
  FRAME_SECONDS, LOUD_ATTACK_SECONDS, LOUD_PROMOTE_H, LOUD_PROMOTE_START,
  LOUD_PROMOTE_STEP, LOUD_PROMOTE_WIDE, LOUD_RELEASE_SECONDS,
  SHOUT_BRIGHTNESS, SHOUT_GAIN, SHOUT_LIMIT, SHOUT_LOW_PASS,
} from "./constants";
import type { MouthLetter } from "./cues";

function rms(samples: Float32Array, start: number, end: number): number {
  let square = 0;
  for (let i = start; i < end; i++) square += samples[i]! ** 2;
  return Math.sqrt(square / Math.max(1, end - start));
}

/** Demo buildLoud: centered 150 ms RMS smoothing, baseline and absolute normalization. */
export function buildLoud(
  samples: Float32Array, sampleRate: number, baseline: number | Float32Array, enabled = false,
): Float32Array {
  const frameSize = Math.max(1, Math.floor(sampleRate * FRAME_SECONDS));
  const count = Math.floor(samples.length / frameSize);
  const out = new Float32Array(count);
  if (!enabled) return out;
  const raw = new Float32Array(count);
  for (let i = 0; i < count; i++) raw[i] = rms(samples, i * frameSize, Math.min(samples.length, (i + 1) * frameSize));
  let base = typeof baseline === "number" ? baseline : 1e-4;
  if (baseline instanceof Float32Array && baseline.length) {
    const sorted = [...baseline].sort((a, b) => a - b);
    base = sorted[Math.floor(sorted.length * 0.6)] ?? 1e-4;
  }
  let y = 0;
  for (let i = 0; i < count; i++) {
    let sum = 0; let n = 0;
    for (let k = i - 7; k <= i + 7; k++) {
      if (raw[k] !== undefined) { sum += raw[k]!; n++; }
    }
    const level = sum / Math.max(1, n);
    const relative = (level / Math.max(1e-4, base) - 1.2) / 0.9;
    const absolute = (level / 0.09 - 0.8) / 0.8;
    const target = Math.max(0, Math.min(1, 0.5 * relative + 0.5 * absolute));
    const coefficient = target > y ? FRAME_SECONDS / LOUD_ATTACK_SECONDS : FRAME_SECONDS / LOUD_RELEASE_SECONDS;
    y += (target - y) * Math.min(1, coefficient);
    out[i] = y;
  }
  return out;
}

/** Maps the internal shout envelope to the demo's 0..1 mouth expression value. */
export function loudAt(loudness: Float32Array, time: number): number {
  if (!loudness.length) return 0;
  const index = Math.min(loudness.length - 1, Math.max(0, Math.floor(time / FRAME_SECONDS)));
  return Math.max(0, Math.min(1, (loudness[index]! - LOUD_PROMOTE_START) / LOUD_PROMOTE_STEP));
}

export function loudMean(loudness: Float32Array, start: number, end: number): number {
  let sum = 0; let count = 0;
  for (let time = start; time < Math.max(end, start + FRAME_SECONDS); time += FRAME_SECONDS) {
    sum += loudAt(loudness, time); count++;
  }
  return count ? sum / count : 0;
}

/** Demo shoutFx: one-pole high pass brightness lift, +9.5 dB drive and soft limit. */
export function shoutGain(samples: Float32Array): Float32Array {
  const out = new Float32Array(samples.length); let low = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]!;
    low += SHOUT_LOW_PASS * (sample - low);
    const high = sample - low;
    out[i] = Math.tanh(SHOUT_GAIN * (sample + SHOUT_BRIGHTNESS * high)) * SHOUT_LIMIT;
  }
  return out;
}

/** buildSegments' loud mouth promotion table. */
export function promoteLoud(letter: MouthLetter, loudness: number): MouthLetter {
  if (letter === "A" || loudness < LOUD_PROMOTE_START) return letter;
  if (loudness >= LOUD_PROMOTE_WIDE) return "BCDE".includes(letter) ? "D" : letter;
  if (loudness >= LOUD_PROMOTE_STEP) {
    if (letter === "B") return "C";
    if (letter === "C" || letter === "E") return "D";
  }
  if (loudness >= LOUD_PROMOTE_H && letter === "C") return "D";
  return letter;
}
