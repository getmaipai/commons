/** Pixel maths shared by the speaking layers: head-track affines, region blocks and the flow warp kernel. */
export const SRC_X = 224;
export const SRC_W = 576;
/** [a, b, tx, c, d, ty]: frame position of a rest-frame point (x, y) is (a x + b y + tx, c x + d y + ty). */
export type Affine = readonly number[];
export type Region = readonly [number, number, number, number];
export const IDENTITY: Affine = [1, 0, 0, 0, 1, 0];
export type Block = { bx0: number; by0: number; BW: number; BH: number };

/** The canvas scale of the 576 px source frame. */
export const frameScale = (canvasWidth: number): number => canvasWidth / SRC_W;

export function invert(m: Affine): { ia: number; ib: number; ic: number; id: number } {
  const [a, b, , c, d] = m as [number, number, number, number, number];
  const det = a * d - b * c;
  return { ia: d / det, ib: -b / det, ic: -c / det, id: a / det };
}

/** Where a rest-frame point lands on the canvas. */
export function toCanvas(m: Affine, k: number, x: number, y: number): [number, number] {
  const [a, b, tx, c, d, ty] = m as [number, number, number, number, number, number];
  return [k * (a * x + b * y + tx - SRC_X), k * (c * x + d * y + ty)];
}

/** Canvas bounding box of a rest-frame region under the head track, clipped to the canvas. */
export function regionBlock(m: Affine, region: Region, k: number, width: number, height: number, pad: number): Block {
  const [x0, y0, w, h] = region;
  const corners = [toCanvas(m, k, x0, y0), toCanvas(m, k, x0 + w, y0), toCanvas(m, k, x0, y0 + h), toCanvas(m, k, x0 + w, y0 + h)];
  const xs = corners.map((p) => p[0]); const ys = corners.map((p) => p[1]);
  const bx0 = Math.max(0, Math.floor(Math.min(...xs)) - pad); const by0 = Math.max(0, Math.floor(Math.min(...ys)) - pad);
  const bx1 = Math.min(width, Math.ceil(Math.max(...xs)) + pad); const by1 = Math.min(height, Math.ceil(Math.max(...ys)) + pad);
  return { bx0, by0, BW: Math.max(0, bx1 - bx0), BH: Math.max(0, by1 - by0) };
}

export function trackAt(track: readonly Affine[] | undefined, frame: number): Affine {
  if (!track?.length) return IDENTITY;
  return track[Math.max(0, Math.min(track.length - 1, Math.round(frame)))] ?? IDENTITY;
}

/** Bilinear sample of a W-wide plane. */
export function bilinear(plane: ArrayLike<number>, stride: number, x: number, y: number): number {
  const xi = x | 0; const yi = y | 0; const fx = x - xi; const fy = y - yi; const i = yi * stride + xi;
  return (plane[i]! * (1 - fx) + plane[i + 1]! * fx) * (1 - fy) + (plane[i + stride]! * (1 - fx) + plane[i + stride + 1]! * fx) * fy;
}

/**
 * Sums `weight * flow` of one pose plane of a half-resolution (hw x hh) int16 field at region position (rx, ry),
 * adding the raw (x, y) pair into `into`. Callers scale by 1 / flowScale.
 */
export function addHalfFlow(
  flow: Int16Array, plane: number, pose: number, hw: number, hh: number, rx: number, ry: number, weight: number, into: Float64Array,
): void {
  const gx = Math.min(hw - 2, rx / 2); const gy = Math.min(hh - 2, ry / 2); const gxi = gx | 0; const gyi = gy | 0;
  const fx = gx - gxi; const fy = gy - gyi; const base = pose * plane + (gyi * hw + gxi) * 2; const base2 = base + hw * 2;
  into[0]! += weight * ((flow[base]! * (1 - fx) + flow[base + 2]! * fx) * (1 - fy) + (flow[base2]! * (1 - fx) + flow[base2 + 2]! * fx) * fy);
  into[1]! += weight * ((flow[base + 1]! * (1 - fx) + flow[base + 3]! * fx) * (1 - fy) + (flow[base2 + 1]! * (1 - fx) + flow[base2 + 3]! * fx) * fy);
}

export type WarpSpec = {
  src: Uint8ClampedArray; block: Block; k: number; m: Affine; region: Region;
  /** Region-sized weight map; null means 1 everywhere. */
  weight: Float32Array | null;
  /** Pixels closer than this to a region edge are left alone. */
  margin: number;
  /** Skip destination pixels whose alpha is below 250 (keyed background). */
  onlyOpaque?: boolean;
  /** Writes the region-pixel displacement for (rx, ry) into d (already scaled by the weight); zeros leave the pixel alone. */
  displace(rx: number, ry: number, wv: number, d: Float64Array): void;
  /** Adds an extra colour residual after the warp (value space 0..255). */
  residual?(rx: number, ry: number, rgb: Float64Array): void;
};

/**
 * Pulls every destination pixel from the displaced rest position, bilinear and alpha weighted, keeping the destination alpha.
 * `src` is the block read from the canvas; the result is a new block to put back.
 */
export function warpRegion(spec: WarpSpec): Uint8ClampedArray {
  const { src, block, k, m, region, weight, margin } = spec;
  const { bx0, by0, BW, BH } = block; const [X0, Y0, W, H] = region;
  const [a, b, tx, c, d, ty] = m as [number, number, number, number, number, number]; const { ia, ib, ic, id } = invert(m);
  const out = new Uint8ClampedArray(src); const disp = new Float64Array(2); const rgb = new Float64Array(3);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const o4 = (y * BW + x) * 4;
      if (spec.onlyOpaque && src[o4 + 3]! < 250) continue;
      const px = (x + bx0 + 0.5) / k + SRC_X - tx; const py = (y + by0 + 0.5) / k - ty;
      const rx = ia * px + ib * py - X0; const ry = ic * px + id * py - Y0;
      if (rx < margin || ry < margin || rx >= W - 1 || ry >= H - 1) continue;
      const wv = weight ? bilinear(weight, W, rx, ry) : 1;
      if (wv < 0.003) continue;
      disp[0] = 0; disp[1] = 0; spec.displace(rx, ry, wv, disp);
      let r = src[o4]!; let g = src[o4 + 1]!; let bl = src[o4 + 2]!;
      if (disp[0] !== 0 || disp[1] !== 0) {
        const rx2 = rx + X0 + disp[0]!; const ry2 = ry + Y0 + disp[1]!;
        const scx = k * (a * rx2 + b * ry2 + tx - SRC_X) - bx0 - 0.5; const scy = k * (c * rx2 + d * ry2 + ty) - by0 - 0.5;
        if (scx < 0 || scy < 0 || scx >= BW - 1 || scy >= BH - 1) continue;
        const xi = scx | 0; const yi = scy | 0; const fx = scx - xi; const fy = scy - yi;
        const q00 = (yi * BW + xi) * 4; const q10 = q00 + 4; const q01 = q00 + BW * 4; const q11 = q01 + 4;
        const w00 = (1 - fx) * (1 - fy) * src[q00 + 3]!; const w10 = fx * (1 - fy) * src[q10 + 3]!;
        const w01 = (1 - fx) * fy * src[q01 + 3]!; const w11 = fx * fy * src[q11 + 3]!; const ws = w00 + w10 + w01 + w11;
        if (ws < 1) continue;
        r = (src[q00]! * w00 + src[q10]! * w10 + src[q01]! * w01 + src[q11]! * w11) / ws;
        g = (src[q00 + 1]! * w00 + src[q10 + 1]! * w10 + src[q01 + 1]! * w01 + src[q11 + 1]! * w11) / ws;
        bl = (src[q00 + 2]! * w00 + src[q10 + 2]! * w10 + src[q01 + 2]! * w01 + src[q11 + 2]! * w11) / ws;
      }
      if (spec.residual) { rgb[0] = r; rgb[1] = g; rgb[2] = bl; spec.residual(rx, ry, rgb); r = rgb[0]; g = rgb[1]; bl = rgb[2]; }
      out[o4] = r; out[o4 + 1] = g; out[o4 + 2] = bl;
    }
  }
  return out;
}
