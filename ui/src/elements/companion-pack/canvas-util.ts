export type Surface = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
/** Off-screen tile used to paste generated pictures; tests replace it with a fake. */
export let createSurface = (width: number, height: number): Surface => {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("A 2D canvas is needed for the speaking layers.");
  return { canvas, ctx };
};
export function setSurfaceFactory(factory: typeof createSurface): () => void {
  const previous = createSurface; createSurface = factory;
  return () => { createSurface = previous; };
}
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** Sets a canvas blur filter where the browser has one (Safari ignores it; the pasted picture is then just unblurred). */
export function setBlur(ctx: CanvasRenderingContext2D, px: number): void {
  if ("filter" in ctx) (ctx as CanvasRenderingContext2D & { filter: string }).filter = px > 0 ? `blur(${px}px)` : "none";
}
/** ImageData over an existing RGBA array (the arrays here are never shared buffers). */
export const imageData = (data: Uint8ClampedArray, width: number, height: number): ImageData =>
  new ImageData(data as Uint8ClampedArray<ArrayBuffer>, width, height);
