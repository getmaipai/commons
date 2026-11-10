import { createSurface, imageData, type Surface } from "./canvas-util";
import { regionBlock, SRC_X, toCanvas } from "./geometry";
import type { Affine } from "./geometry";
import type { EyesData, Raster } from "./pack-loader";

export type Lid = { half: number; closed: number };
export type LidState = { off?: number[]; skin?: number[]; tile?: Surface; mean: Map<Raster, number[] | null> };
export const newLidState = (): LidState => ({ mean: new Map() });

/** Hard pick of the eyelid picture: closed above 0.6, half above 0.3, otherwise none (no blend, so no ghosted open eye). */
export function pickLid(lid: Lid | null): "closed" | "half" | null {
  if (!lid) return null;
  return lid.closed > 0.6 ? "closed" : Math.max(lid.half, lid.closed) > 0.3 ? "half" : null;
}

/** Mean colour of the lit skin pixels of a lid picture (used to match its brightness to the live skin). */
export function pictureMean(pic: Raster): number[] | null {
  const sum = [0, 0, 0]; let n = 0; const d = pic.data;
  for (let q = 0; q < d.length; q += 4) {
    if (d[q + 3]! > 200 && d[q]! > 120 && d[q + 1]! > 80) { sum[0]! += d[q]!; sum[1]! += d[q + 1]!; sum[2]! += d[q + 2]!; n++; }
  }
  return n > 50 ? sum.map((v) => v / n) : null;
}

/** Mean difference live minus reference over the eye-ring points, and the mean live colour; null with too few usable points. */
export function ringOffsets(
  live: Uint8ClampedArray,
    BW: number,
    BH: number,
    pts: number[],
    ref: Uint8ClampedArray,
    W: number,
    map: (x: number, y: number) => [number, number],
    bx0: number,
    by0: number,
): { off: number[]; skin: number[] } | null {
  const diff = [0, 0, 0]; const skin = [0, 0, 0]; let n = 0;
  for (let i = 0; i < pts.length; i += 2) {
    const [cx, cy] = map(pts[i]! + 0.5, pts[i + 1]! + 0.5); const px = Math.round(cx) - bx0; const py = Math.round(cy) - by0;
    if (px < 0 || py < 0 || px >= BW || py >= BH) continue;
    const q = (py * BW + px) * 4;
    if (live[q + 3]! < 250) continue;
    const r = (pts[i + 1]! * W + pts[i]!) * 4;
    for (let ch = 0; ch < 3; ch++) { diff[ch]! += live[q + ch]! - ref[r + ch]!; skin[ch]! += live[q + ch]!; }
    n++;
  }
  return n > 20 ? { off: diff.map((v) => v / n), skin: skin.map((v) => v / n) } : null;
}

/** Half-closed or closed eye picture pasted inside the eye mask, colour matched to the live skin, moving with the head. */
export function drawLids(
  ctx: CanvasRenderingContext2D, k: number, m: Affine, eyes: EyesData, lid: Lid | null, st: LidState, lift: number, alpha: number,
): boolean {
  const pick = pickLid(lid);
  if (!pick || alpha <= 0.01) return false;
  const [X0, Y0, W, H] = eyes.region; const { width, height } = ctx.canvas;
  const block = regionBlock(m, eyes.region, k, width, height, 1);
  if (block.BW < 4 || block.BH < 4) return false;
  const [a, b, tx, c, d, ty] = m as [number, number, number, number, number, number];
  const live = ctx.getImageData(block.bx0, block.by0, block.BW, block.BH).data;
  const found = ringOffsets(live, block.BW, block.BH, eyes.pts, eyes.ref.data, W, (x, y) => toCanvas(m, k, X0 + x, Y0 + y), block.bx0, block.by0);
  const prev = st.off;
  const off = found ? found.off : (prev ?? [0, 0, 0]);
  st.off = prev ? prev.map((v, i) => v + (off[i]! - v) * 0.5) : off;
  if (found) st.skin = st.skin ? st.skin.map((v, i) => v + (found.skin[i]! - v) * 0.5) : found.skin;
  const pic = pick === "closed" ? eyes.closed : eyes.half;
  if (!st.mean.has(pic)) st.mean.set(pic, pictureMean(pic));
  const pm = st.mean.get(pic); const shift = pm && st.skin ? st.skin.map((v, i) => v + 8 + lift - pm[i]!) : st.off;
  st.tile ??= createSurface(W, H);
  const out = new Uint8ClampedArray(pic.data.length);
  for (let q = 0; q < out.length; q += 4) { out[q + 3] = pic.data[q + 3]!; for (let ch = 0; ch < 3; ch++) out[q + ch] = pic.data[q + ch]! + shift![ch]!; }
  st.tile.ctx.putImageData(imageData(out, W, H), 0, 0);
  ctx.setTransform(k * a, k * c, k * b, k * d, k * (tx - SRC_X), k * ty);
  ctx.globalAlpha = Math.min(1, alpha); ctx.drawImage(st.tile.canvas, X0, Y0);
  ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
  return true;
}
