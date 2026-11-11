import { imageData, smooth } from "./canvas-util";
import type { Affine } from "./geometry";
import { regionBlock, warpRegion } from "./geometry";
import type { PackFrame } from "./geometry";
import type { EmotionData } from "./pack-loader";
import { emotionFor } from "./life";
import type { EmotionName, SpeechInput } from "./speech";

export type EmotionWeights = Record<EmotionName, number>;
export const EMOTION_KINDS: EmotionName[] = ["angry", "excited", "alarmed", "sad"];
export const newEmotionWeights = (): EmotionWeights => ({ angry: 0, excited: 0, alarmed: 0, sad: 0 });

/** Which emotion a line shows and how it was chosen (a forced kind starts at level 0.7, words found at 0.35). */
export function chooseEmotion(input: Pick<SpeechInput, "emotion" | "text" | "tags" | "voiceMode">):
{ kind: EmotionName | null; forced: boolean; found: boolean } {
  if (input.emotion === null || input.emotion === "none") return { kind: null, forced: false, found: false };
  if (input.emotion && input.emotion !== "auto") return { kind: input.emotion, forced: true, found: false };
  const fromWords = emotionFor(input.text ?? "", input.tags ?? [], false);
  if (fromWords) return { kind: fromWords, forced: false, found: true };
  return { kind: input.voiceMode === "shout" ? "excited" : null, forced: false, found: false };
}
export const emotionLevel = (kind: EmotionName | null, forced: boolean, found: boolean, loud: number, gain = 1): number =>
  kind ? Math.min(1, Math.max(forced ? 0.7 : found ? 0.35 : 0, loud)) * gain : 0;

/**
 * One smooth ramp per frame: the chosen kind eases to its level (never above what the others leave of 1), the rest ease to 0.
 * Rates are the demo's per-frame values at 60 fps; `frames` scales them for other frame times.
 */
export function stepEmotionWeights(w: EmotionWeights, kind: EmotionName | null, level: number, frames = 1): number {
  let others = 0;
  for (const key of EMOTION_KINDS) if (key !== kind) others += w[key];
  for (const key of EMOTION_KINDS) {
    if (key === kind) {
      const target = Math.min(level, Math.max(0, 1 - others)); const rate = target > w[key] ? 0.16 : 0.1;
      w[key] += (target - w[key]) * (1 - (1 - rate) ** frames);
    } else w[key] = Math.max(0, w[key] - 0.09 * frames);
    if (w[key] < 0.004) w[key] = 0;
  }
  return EMOTION_KINDS.reduce((sum, key) => sum + w[key], 0);
}

/** Upper-face emotion: flows of every active kind add in one warp, signed residuals (shading, wrinkles) add linearly. */
export function drawEmotionMix(ctx: CanvasRenderingContext2D, k: number, m: Affine, data: EmotionData, weights: Record<string, number>, frame?: PackFrame): boolean {
  const act = Object.entries(weights).filter(([kind, w]) => data.kinds[kind] && w > 0.005);
  if (!act.length) return false;
  const { width, height } = ctx.canvas; const block = regionBlock(m, data.region, k, width, height, 2, frame);
  if (block.BW < 4 || block.BH < 4) return false;
  const [, , W] = data.region;
  const kinds = act.map(([kind, w]) => {
    const K = data.kinds[kind]!;
    return { w: Math.min(1, w / K.full), fl: K.flow, pd: K.patch.data, pa: smooth((w - K.ease[0]) / (K.ease[1] - K.ease[0])) };
  });
  const src = ctx.getImageData(block.bx0, block.by0, block.BW, block.BH);
  const out = warpRegion({
    src: src.data, block, k, m, region: data.region, weight: null, margin: 0, onlyOpaque: true, frame,
    displace(rx, ry, _wv, d) {
      const x0 = rx | 0;
      const y0 = ry | 0;
      const fx = rx - x0;
      const fy = ry - y0;
      const i00 = y0 * W + x0;
      const i10 = i00 + 1;
      const i01 = i00 + W;
      const i11 = i01 + 1;
      const w00 = (1 - fx) * (1 - fy); const w10 = fx * (1 - fy); const w01 = (1 - fx) * fy; const w11 = fx * fy;
      for (const K of kinds) {
        const f = K.fl;
        d[0]! += K.w * (f[i00 * 2]! * w00 + f[i10 * 2]! * w10 + f[i01 * 2]! * w01 + f[i11 * 2]! * w11);
        d[1]! += K.w * (f[i00 * 2 + 1]! * w00 + f[i10 * 2 + 1]! * w10 + f[i01 * 2 + 1]! * w01 + f[i11 * 2 + 1]! * w11);
      }
      d[0]! /= 64; d[1]! /= 64;
    },
    residual(rx, ry, rgb) {
      const x0 = rx | 0;
      const y0 = ry | 0;
      const fx = rx - x0;
      const fy = ry - y0;
      const i00 = y0 * W + x0;
      const i10 = i00 + 1;
      const i01 = i00 + W;
      const i11 = i01 + 1;
      const w00 = (1 - fx) * (1 - fy); const w10 = fx * (1 - fy); const w01 = (1 - fx) * fy; const w11 = fx * fy;
      for (const K of kinds) {
        if (K.pa <= 0) continue;
        const pd = K.pd; const alpha = ((pd[i00 * 4 + 3]! * w00 + pd[i10 * 4 + 3]! * w10 + pd[i01 * 4 + 3]! * w01 + pd[i11 * 4 + 3]! * w11) / 255) * K.pa;
        if (alpha <= 0) continue;
        for (let ch = 0; ch < 3; ch++) {
          const v = pd[i00 * 4 + ch]! * w00 + pd[i10 * 4 + ch]! * w10 + pd[i01 * 4 + ch]! * w01 + pd[i11 * 4 + ch]! * w11;
          rgb[ch]! += (v - 128) * 2 * alpha;
        }
      }
    },
  });
  ctx.putImageData(imageData(out, block.BW, block.BH), block.bx0, block.by0);
  return true;
}
