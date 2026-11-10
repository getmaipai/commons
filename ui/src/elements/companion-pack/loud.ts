import { FRAME_SECONDS, LOUD_ATTACK_SECONDS, LOUD_RELEASE_SECONDS } from "./constants";
import type { MouthLetter } from "./cues";

export function buildLoud(samples: Float32Array, sampleRate: number, baseline: number | Float32Array, enabled = false): Float32Array {
  const count = Math.floor(samples.length / (sampleRate * FRAME_SECONDS));
  const out = new Float32Array(count);
  if (!enabled) return out;
  const base = typeof baseline === "number" ? baseline : baseline.length
    ? Array.from(baseline).sort((a, b) => a - b)[Math.floor(baseline.length * 0.6)] ?? 1e-4 : 1e-4;
  let y = 0;
  for (let i = 0; i < count; i++) {
    let sum = 0; let n = 0;
    for (let k = i - 7; k <= i + 7; k++) {
      if (k < 0 || k >= count) continue;
      const start = Math.floor(k * sampleRate * FRAME_SECONDS);
      let square = 0;
      for (let j = start; j < Math.min(samples.length, start + sampleRate * FRAME_SECONDS); j++) square += samples[j]! ** 2;
      sum += Math.sqrt(square / Math.max(1, Math.floor(sampleRate * FRAME_SECONDS))); n++;
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

export function promoteLoud(letter: MouthLetter, loudness: number): MouthLetter {
  if (letter === "A") return "A";
  if (loudness < 0.35) return letter;
  if (loudness >= 0.8) return ["B", "C", "D", "E"].includes(letter) ? "D" : letter;
  if (loudness >= 0.5) {
    if (letter === "B") return "C";
    if (letter === "C") return "D";
    if (letter === "D" || letter === "E") return "D";
  }
  if (loudness >= 0.55 && letter === "C") return "H";
  return letter;
}
