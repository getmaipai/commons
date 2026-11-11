import { imageData } from "./canvas-util";
import type { Affine, PackFrame } from "./geometry";
import { addHalfFlow, regionBlock, warpRegion } from "./geometry";
import type { HeadData } from "./pack-loader";

export type PoseWeights = Record<string, number>;
export const activePoses = (head: HeadData, fx: PoseWeights): [number, number][] =>
  head.poses.map((pose, i): [number, number] => [i, fx[pose] ?? 0]).filter(([, w]) => Math.abs(w) > 0.01);

/** Displacement builder for the head flow fields: active pose planes summed, scaled by the weight map and 1 / flowScale. */
export function headDisplace(head: HeadData, act: [number, number][]) {
  const [hw, hh] = head.flowHalf; const plane = hh * hw * 2; const scale = 1 / head.flowScale;
  return (rx: number, ry: number, wv: number, d: Float64Array): void => {
    for (const [pose, weight] of act) addHalfFlow(head.flow, plane, pose, hw, hh, rx, ry, weight, d);
    d[0]! *= scale * wv; d[1]! *= scale * wv;
  };
}

/** Whole-head nod, tilt, brow, gaze and micro motions as baked flow fields, drawn after the mouth so everything moves together. */
export function drawHead(ctx: CanvasRenderingContext2D, k: number, m: Affine, head: HeadData, fx: PoseWeights, frame?: PackFrame): boolean {
  const act = activePoses(head, fx);
  if (!act.length) return false;
  const { width, height } = ctx.canvas; const block = regionBlock(m, head.region, k, width, height, 2, frame);
  if (block.BW < 4 || block.BH < 4) return false;
  const src = ctx.getImageData(block.bx0, block.by0, block.BW, block.BH);
  const out = warpRegion({ src: src.data, block, k, m, region: head.region, weight: head.weight, margin: 1, frame, displace: headDisplace(head, act) });
  ctx.putImageData(imageData(out, block.BW, block.BH), block.bx0, block.by0);
  return true;
}
