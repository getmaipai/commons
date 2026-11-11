import { createSurface, imageData, setBlur, type Surface } from "./canvas-util";
import { addHalfFlow, DEFAULT_FRAME, regionBlock, toCanvas, warpRegion } from "./geometry";
import type { PackFrame } from "./geometry";
import type { Affine } from "./geometry";
import type { MouthSet, Stat, TileMouth, WarpMouth } from "./pack-loader";
import type { RenderProfile } from "./profile";

/** Which letter planes (and weights) a tile slot blends: 1..7 are single shapes, 8+ are baked in-betweens of a pair. */
export function slotWeights(slot: number, base: number, ts: number[]): [number, number][] {
  if (slot < 8) return slot ? [[slot, 1]] : [];
  const q = slot - base; const pair = Math.floor(q / ts.length); const t = ts[q % ts.length]!;
  return ([[Math.floor(pair / 8), 1 - t], [pair % 8, t]] as [number, number][]).filter(([shape, w]) => shape > 0 && w > 0.001);
}

/** Copies one atlas tile (row-major, `cols` wide) into `into`. */
export function tilePixels(
  atlas: { w: number; data: Uint8ClampedArray }, cols: number, tw: number, th: number, slot: number, into: Uint8ClampedArray,
): Uint8ClampedArray {
  const col = slot % cols; const row = Math.floor(slot / cols);
  for (let y = 0; y < th; y++) {
    const from = ((row * th + y) * atlas.w + col * tw) * 4;
    into.set(atlas.data.subarray(from, from + tw * 4), y * tw * 4);
  }
  return into;
}

export type Offsets = { off: number[]; sd: number; rsd: number };
/**
 * Compares the live frame to the reference tile at listed tile points: mean colour offset, and the live and reference luma spread.
 * `map` sends a tile point (x, y) to block pixels; points off the block, on transparent live pixels or (optionally) on green are skipped.
 */
export function sampleOffsets(
  live: Uint8ClampedArray, BW: number, BH: number, list: number[], ref: Uint8ClampedArray, tw: number,
  map: (x: number, y: number) => [number, number], minN: number, skipGreen: boolean,
): Offsets | null {
  let n = 0; let l = 0; let ll = 0; let rl = 0; let rll = 0; const sum = [0, 0, 0];
  for (let i = 0; i < list.length; i += 2) {
    const [cx, cy] = map(list[i]! + 0.5, list[i + 1]! + 0.5); const px = Math.round(cx); const py = Math.round(cy);
    if (px < 0 || py < 0 || px >= BW || py >= BH) continue;
    const q = (py * BW + px) * 4;
    if (live[q + 3]! < 250) continue;
    const aq = (list[i + 1]! * tw + list[i]!) * 4;
    if (skipGreen && ref[aq + 1]! > 150 && ref[aq]! < 90 && ref[aq + 2]! < 90) continue;
    for (let ch = 0; ch < 3; ch++) sum[ch]! += live[q + ch]! - ref[aq + ch]!;
    const v = 0.3 * live[q]! + 0.59 * live[q + 1]! + 0.11 * live[q + 2]!; const r = 0.3 * ref[aq]! + 0.59 * ref[aq + 1]! + 0.11 * ref[aq + 2]!;
    l += v; ll += v * v; rl += r; rll += r * r; n++;
  }
  if (n <= minN) return null;
  return { off: sum.map((v) => v / n), sd: Math.sqrt(Math.max(1, ll / n - (l / n) ** 2)), rsd: Math.sqrt(Math.max(1, rll / n - (rl / n) ** 2)) };
}

export type Harmony = { ring: number[]; core: number[]; gain: number };
export type MouthState = { harm: Harmony | null; tile?: Surface; pixels?: Uint8ClampedArray; out?: Uint8ClampedArray; tw?: number; th?: number };
/** Scratch buffers and tile surface sized for the current set (calm and shout sets can differ in tile size). */
export function scratchFor(state: MouthState, tw: number, th: number): void {
  if (state.tw === tw && state.th === th && state.pixels) return;
  state.tw = tw; state.th = th; state.pixels = new Uint8ClampedArray(tw * th * 4); state.out = new Uint8ClampedArray(tw * th * 4);
  state.tile = createSurface(tw, th);
}
export const newMouthState = (): MouthState => ({ harm: null });

/** Eases the colour match toward this frame's measurement (half way per frame, the demo value). */
export function harmonize(state: MouthState, ring: number[], core: number[], gain: number, ease = 0.5): Harmony {
  const h = state.harm ?? (state.harm = { ring: ring.slice(), core: core.slice(), gain });
  for (let ch = 0; ch < 3; ch++) { h.ring[ch]! += (ring[ch]! - h.ring[ch]!) * ease; h.core[ch]! += (core[ch]! - h.core[ch]!) * ease; }
  h.gain += (gain - h.gain) * ease;
  return h;
}
const clampGain = (core: Offsets | null) => (core ? Math.min(1.12, Math.max(0.85, core.sd / core.rsd)) : 1);
const compress = (v: number, hi: number) => (v > hi ? hi + (v - hi) * 0.55 : v);

/** Interior (lips, teeth, cavity) of the man's warp set, colour matched; alpha scaled by `amt`. */
export function composeWarpTile(td: Uint8ClampedArray, out: Uint8ClampedArray, h: Harmony, hi: number, amt: number): void {
  for (let q = 0; q < td.length; q += 4) {
    const al = td[q + 3]! / 255; out[q + 3] = al * 255 * amt;
    if (al < 0.004) continue;
    for (let ch = 0; ch < 3; ch++) out[q + ch] = compress((td[q + ch]! + h.ring[ch]! + (h.core[ch]! - h.ring[ch]!) * al - 128) * h.gain + 128, hi);
  }
}
/** Whole sculpted lower face of the cartoon sets, exposure matched to the live frame and masked by the set's alpha. */
export function composeCartoonTile(td: Uint8ClampedArray, out: Uint8ClampedArray, mask: Float32Array, ref: number[], h: Harmony, hi: number): void {
  for (let p = 0, q = 0; p < mask.length; p++, q += 4) {
    const al = mask[p]!; const w = al * al; out[q + 3] = al * 255;
    if (al < 0.004) continue;
    for (let ch = 0; ch < 3; ch++) out[q + ch] = compress((td[q + ch]! - ref[ch]!) * h.gain + ref[ch]! + h.ring[ch]! + (h.core[ch]! - h.ring[ch]!) * w, hi);
  }
}

export type MouthFrame = { ctx: CanvasRenderingContext2D; k: number; m: Affine; slot: number; amt: number; profile: RenderProfile; frame?: PackFrame };

/** The man: his live lower face is displaced by baked flow fields; only the mouth interior is pasted. */
export function drawWarpMouth(f: MouthFrame, set: WarpMouth, state: MouthState): boolean {
  const { ctx, k, m, amt } = f; const frame = f.frame ?? DEFAULT_FRAME; const weights = slotWeights(f.slot, set.base, set.ts);
  if (!weights.length || amt <= 0.01) return false;
  const { width, height } = ctx.canvas; const region = set.region; const block = regionBlock(m, region, k, width, height, 2, frame);
  if (block.BW < 4 || block.BH < 4) return false;
  const [hw, hh] = set.flowHalf; const plane = hh * hw * 2; const scale = (1 / set.flowScale) * amt;
  const src = ctx.getImageData(block.bx0, block.by0, block.BW, block.BH);
  const warped = warpRegion({
    src: src.data, block, k, m, region, weight: set.weight, margin: 1, frame,
    displace(rx, ry, wv, d) {
      for (const [shape, w] of weights) addHalfFlow(set.flow, plane, shape, hw, hh, rx, ry, w, d);
      d[0]! *= scale * wv; d[1]! *= scale * wv;
    },
  });
  const [a, b, tx, c, d, ty] = m as [number, number, number, number, number, number];
  const mapTile = (x: number, y: number): [number, number] => {
    const [cx, cy] = toCanvas(m, k, set.tx + x, set.ty + y, frame);
    return [cx - block.bx0, cy - block.by0];
  };
  const ring = sampleOffsets(src.data, block.BW, block.BH, set.ring, set.rest.data, set.tw, mapTile, 12, false);
  const core = sampleOffsets(src.data, block.BW, block.BH, set.core, set.rest.data, set.tw, mapTile, 12, false);
  const ringOff = ring ? ring.off : [0, 0, 0];
  const h = harmonize(state, ringOff, core ? core.off : ringOff, clampGain(core));
  ctx.putImageData(imageData(warped, block.BW, block.BH), block.bx0, block.by0);
  scratchFor(state, set.tw, set.th);
  composeWarpTile(tilePixels(set.atlas, set.cols, set.tw, set.th, f.slot, state.pixels!), state.out!, h, f.profile.hi, amt);
  state.tile!.ctx.putImageData(imageData(state.out!, set.tw, set.th), 0, 0);
  ctx.setTransform(k * a, k * c, k * b, k * d, k * (tx - frame.x0), k * ty);
  setBlur(ctx, f.profile.blur); ctx.drawImage(state.tile!.canvas, set.tx, set.ty); setBlur(ctx, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return true;
}

/** Claymation and Pixar: the whole lower-face tile for the chosen shape is pasted over the live face. */
export function drawTileMouth(f: MouthFrame, set: TileMouth, state: MouthState): boolean {
  const { ctx, k, m, amt } = f; const frame = f.frame ?? DEFAULT_FRAME;
  if (amt <= 0.01) return false;
  const [bx, by] = set.box; const TW = set.tw; const TH = set.th; const { width, height } = ctx.canvas;
  const block = regionBlock(m, [bx, by, TW, TH], k, width, height, 1, frame);
  if (block.BW < 4 || block.BH < 4) return false;
  const [a, b, tx, c, d, ty] = m as [number, number, number, number, number, number];
  const mapTile = (x: number, y: number): [number, number] => {
    const [cx, cy] = toCanvas(m, k, bx + x, by + y, frame);
    return [cx - block.bx0, cy - block.by0];
  };
  const live = ctx.getImageData(block.bx0, block.by0, block.BW, block.BH).data;
  const ring = sampleOffsets(live, block.BW, block.BH, set.ring, set.tile0, TW, mapTile, 15, true);
  const core = sampleOffsets(live, block.BW, block.BH, set.core, set.tile0, TW, mapTile, 15, true);
  const ringOff = ring ? ring.off : [0, 0, 0];
  const h = harmonize(state, ringOff, core ? core.off : ringOff, clampGain(core));
  scratchFor(state, TW, TH);
  composeCartoonTile(tilePixels(set.atlas, set.cols, TW, TH, f.slot, state.pixels!), state.out!, set.mask, set.coreRef.mean, h, f.profile.hi);
  state.tile!.ctx.putImageData(imageData(state.out!, TW, TH), 0, 0);
  ctx.setTransform(k * a, k * c, k * b, k * d, k * (tx - frame.x0), k * ty);
  setBlur(ctx, f.profile.blur); ctx.globalAlpha = Math.min(1, f.amt); ctx.drawImage(state.tile!.canvas, bx, by);
  ctx.globalAlpha = 1; setBlur(ctx, 0); ctx.setTransform(1, 0, 0, 1, 0, 0);
  return true;
}

export const drawMouth = (f: MouthFrame, set: MouthSet, state: MouthState): boolean =>
  set.kind === "warp" ? drawWarpMouth(f, set, state) : drawTileMouth(f, set, state);
export type { Stat };
