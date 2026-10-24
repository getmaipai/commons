import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { SafeImage } from "./SafeImage";

export type FocalMapAnalyzer = (input: Float32Array) => Promise<Float32Array>;

const FocalMapContext = createContext<FocalMapAnalyzer | null>(null);

/** Enables locally computed, content-aware crops for images below this provider. */
export function FocalImageProvider({ analyze, children }: { analyze: FocalMapAnalyzer; children: ReactNode }) {
  return <FocalMapContext.Provider value={analyze}>{children}</FocalMapContext.Provider>;
}

type Props = Omit<ComponentProps<typeof SafeImage>, "onLoad"> & { aspectRatio?: number; onLoad?: ComponentProps<typeof SafeImage>["onLoad"] };
const cache = new Map<string, string>();

/** Prefer the actual rendered frame ratio over a caller hint; theme tokens can change the frame after props are set. */
export function focalAspectRatio(frameWidth: number, frameHeight: number, requestedAspectRatio?: number): number {
  if (Number.isFinite(frameWidth) && Number.isFinite(frameHeight) && frameWidth > 0 && frameHeight > 0) return frameWidth / frameHeight;
  return requestedAspectRatio && Number.isFinite(requestedAspectRatio) && requestedAspectRatio > 0 ? requestedAspectRatio : 1;
}

/** Removes the black letterbox around FocalNet's square input map. */
export function restoreFocalMap(map: Float32Array, imageWidth: number, imageHeight: number): Float32Array {
  if (map.length !== 64 * 64 || imageWidth < 1 || imageHeight < 1) return new Float32Array(64 * 64);
  const scale = Math.min(256 / imageWidth, 256 / imageHeight);
  const contentWidth = Math.max(1, Math.round(imageWidth * scale));
  const contentHeight = Math.max(1, Math.round(imageHeight * scale));
  const left = Math.floor((256 - contentWidth) / 2);
  const top = Math.floor((256 - contentHeight) / 2);
  const restored = new Float32Array(64 * 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const sx = (left + (x + 0.5) * contentWidth / 64) / 4 - 0.5;
    const sy = (top + (y + 0.5) * contentHeight / 64) / 4 - 0.5;
    const x0 = Math.max(0, Math.min(63, Math.floor(sx)));
    const y0 = Math.max(0, Math.min(63, Math.floor(sy)));
    const x1 = Math.min(63, x0 + 1);
    const y1 = Math.min(63, y0 + 1);
    const wx = Math.max(0, Math.min(1, sx - x0));
    const wy = Math.max(0, Math.min(1, sy - y0));
    const a = map[y0 * 64 + x0]! * (1 - wx) + map[y0 * 64 + x1]! * wx;
    const b = map[y1 * 64 + x0]! * (1 - wx) + map[y1 * 64 + x1]! * wx;
    restored[y * 64 + x] = a * (1 - wy) + b * wy;
  }
  return restored;
}

/** Converts an importance map into the object-position percentage for the largest crop at a target ratio. */
export function focalObjectPosition(map: Float32Array, imageWidth: number, imageHeight: number, aspectRatio: number): string {
  if (map.length !== 64 * 64 || imageWidth < 1 || imageHeight < 1 || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return "50% 50%";
  let cropWidth = imageWidth;
  let cropHeight = imageHeight;
  if (imageWidth / imageHeight > aspectRatio) cropWidth = Math.max(1, Math.round(imageHeight * aspectRatio));
  else cropHeight = Math.max(1, Math.round(imageWidth / aspectRatio));

  let total = 0;
  const columns = new Float64Array(64);
  const rows = new Float64Array(64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const value = Number.isFinite(map[y * 64 + x]) ? Math.max(0, map[y * 64 + x]!) : 0;
    columns[x]! += value;
    rows[y]! += value;
    total += value;
  }
  if (!total) return "50% 50%";

  const bestOffset = (weights: Float64Array, extent: number, window: number) => {
    const cell = extent / weights.length;
    let best = -1;
    let bestAt = (extent - window) / 2;
    const step = Math.max(1, Math.floor(cell / 2));
    for (let at = 0; at <= extent - window; at += step) {
      let score = 0;
      for (let i = 0; i < weights.length; i++) {
        const overlap = Math.max(0, Math.min(at + window, (i + 1) * cell) - Math.max(at, i * cell));
        score += weights[i]! * overlap / cell;
      }
      if (score > best) { best = score; bestAt = at; }
    }
    const at = Math.min(extent - window, Math.max(0, Math.round(bestAt)));
    return extent === window ? 0 : at / (extent - window) * 100;
  };
  const x = cropWidth < imageWidth ? bestOffset(columns, imageWidth, cropWidth) : 50;
  const y = cropHeight < imageHeight ? bestOffset(rows, imageHeight, cropHeight) : 50;
  return `${x}% ${y}%`;
}

/** Image with optional focal framing. It stays centered until an analyzer is provided and returns a crop. */
export function FocalImage({ src, aspectRatio, onLoad, style, ...props }: Props) {
  const analyze = useContext(FocalMapContext);
  const imageRef = useRef<HTMLImageElement>(null);
  const visibleRef = useRef(false);
  const startedRef = useRef(false);
  const analyzeVisibleRef = useRef<() => void>(() => {});
  const [position, setPosition] = useState("50% 50%");
  const source = typeof src === "string" ? src : "";

  useEffect(() => {
    setPosition("50% 50%");
    visibleRef.current = false;
    startedRef.current = false;
    analyzeVisibleRef.current = () => {};
    if (!source || !analyze) return;
    const image = imageRef.current;
    if (!image) return;
    let cancelled = false;
    const run = () => {
      if (cancelled || !visibleRef.current || startedRef.current || !image.complete || image.naturalWidth === 0) return;
      startedRef.current = true;
      const ratio = focalAspectRatio(image.clientWidth, image.clientHeight, aspectRatio);
      if (!Number.isFinite(ratio) || ratio <= 0) return;
      const key = `${source}|${ratio.toFixed(4)}`;
      const existing = cache.get(key);
      if (existing) { setPosition(existing); return; }
      void analyzeImage(image, analyze, ratio).then((next) => {
        if (cancelled) return;
        if (cache.size > 200) cache.delete(cache.keys().next().value as string);
        cache.set(key, next);
        setPosition(next);
      }).catch(() => {});
    };
    analyzeVisibleRef.current = run;
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "undefined") visibleRef.current = true;
    else {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          visibleRef.current = true;
          observer?.disconnect();
          run();
        }
      }, { rootMargin: "100px" });
      observer.observe(image);
    }
    return () => { cancelled = true; observer?.disconnect(); };
  }, [source, analyze, aspectRatio]);

  async function analyzeImage(image: HTMLImageElement, analyzer: FocalMapAnalyzer, ratio: number): Promise<string> {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas is unavailable");
    const scale = Math.min(256 / image.naturalWidth, 256 / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const left = Math.floor((256 - width) / 2);
    const top = Math.floor((256 - height) / 2);
    context.drawImage(image, left, top, width, height);
    const pixels = context.getImageData(0, 0, 256, 256).data;
    const input = new Float32Array(3 * 256 * 256);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const pixel = ((top + y) * 256 + left + x) * 4;
      const dest = y * 256 + x;
      for (let c = 0; c < 3; c++) input[c * 65536 + dest] = ((pixels[pixel + c]! / 255) - mean[c]!) / std[c]!;
    }
    const map = restoreFocalMap(await analyzer(input), image.naturalWidth, image.naturalHeight);
    return focalObjectPosition(map, image.naturalWidth, image.naturalHeight, ratio);
  }

  return <SafeImage {...props} src={src} imageRef={imageRef} style={{ ...style, objectFit: "cover", objectPosition: position }} onLoad={(event) => { onLoad?.(event); if (!event.currentTarget.complete) return; analyzeVisibleRef.current(); }} />;
}
