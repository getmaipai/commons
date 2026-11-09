"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "cn";

/** Four averaged colors (top-left, top-right, bottom-left, bottom-right) as CSS `color(srgb ...)` strings. */
export type AmbientColors = readonly [string, string, string, string];

const W = 16;
const H = 9;

/** Averages a 16x9 RGBA frame into four quadrant colors. Pure, so it is easy to test. */
export function averageQuadrants(data: ArrayLike<number>, width = W, height = H): AmbientColors {
  const sums = [0, 0, 0, 0].map(() => [0, 0, 0, 0]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const q = (y < height / 2 ? 0 : 2) + (x < width / 2 ? 0 : 1);
      const i = (y * width + x) * 4;
      const s = sums[q]!;
      s[0]! += data[i]!; s[1]! += data[i + 1]!; s[2]! += data[i + 2]!; s[3]! += 1;
    }
  }
  const out = sums.map(([r, g, b, n]) => `color(srgb ${((r! / (n || 1)) / 255).toFixed(3)} ${((g! / (n || 1)) / 255).toFixed(3)} ${((b! / (n || 1)) / 255).toFixed(3)})`);
  return out as unknown as AmbientColors;
}

function prefersReducedMotion(): boolean {
  try { return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/** Reads a frame into a tiny canvas. Returns null when the canvas is missing or the source is cross-origin (tainted). */
function sample(source: CanvasImageSource, canvas: HTMLCanvasElement): AmbientColors | null {
  try {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, W, H);
    return averageQuadrants(ctx.getImageData(0, 0, W, H).data);
  } catch {
    return null;
  }
}

/** YouTube/Plex style ambient light: a soft blurred backdrop behind a player that takes its colors from the poster or the
 * current frame. Purely presentational (`aria-hidden`), drawn behind its parent (`-z-10`, so the parent needs `isolate`),
 * and silent on any canvas or cross-origin failure. While playing it samples about once a second; paused it holds the poster
 * (or the last frame). Under reduced motion it uses the poster once and never samples frames. `ambient={false}` draws nothing. */
export function AmbientGlow({ getVideo, poster, ambient = true, className }: {
  /** Returns the playing video element, when there is one. Read on each sample, so a ref's `.current` works. */
  getVideo?: () => HTMLVideoElement | null | undefined;
  poster?: string;
  ambient?: boolean;
  className?: string;
}) {
  const [colors, setColors] = useState<AmbientColors | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const getter = useRef(getVideo);
  getter.current = getVideo;

  useEffect(() => {
    if (!ambient || typeof document === "undefined") return;
    let dead = false;
    const reduced = prefersReducedMotion();
    const canvasEl = (canvas.current ??= document.createElement("canvas"));
    const apply = (next: AmbientColors | null): boolean => { if (next && !dead) setColors(next); return next !== null; };
    if (poster) {
      try {
        const image = document.createElement("img");
        image.crossOrigin = "anonymous";
        image.onload = () => { apply(sample(image, canvasEl)); };
        image.onerror = () => {};
        image.src = poster;
      } catch { /* the glow just stays off */ }
    }
    if (reduced) return () => { dead = true; };
    const tick = () => {
      const video = getter.current?.();
      if (!video || video.paused || video.ended || video.readyState < 2) return;
      if (!apply(sample(video, canvasEl))) stop();
    };
    const id: ReturnType<typeof setInterval> = setInterval(tick, 1000);
    const stop = () => clearInterval(id);
    return () => { dead = true; stop(); };
  }, [ambient, poster]);

  if (!ambient) return null;
  const style = (colors ? { "--ambient-1": colors[0], "--ambient-2": colors[1], "--ambient-3": colors[2], "--ambient-4": colors[3] } : {}) as CSSProperties;
  const blob = "absolute size-3/5 rounded-full blur-3xl motion-safe:transition-colors motion-safe:duration-1000";
  return (
    <div aria-hidden="true" data-slot="ambient-glow" data-ready={colors ? "true" : "false"} style={style}
      className={cn("pointer-events-none absolute -inset-[6%] -z-10 opacity-0 transition-opacity duration-1000 data-[ready=true]:opacity-60", className)}>
      <span className={cn(blob, "start-0 top-0 bg-(--ambient-1)")} />
      <span className={cn(blob, "end-0 top-0 bg-(--ambient-2)")} />
      <span className={cn(blob, "start-0 bottom-0 bg-(--ambient-3)")} />
      <span className={cn(blob, "end-0 bottom-0 bg-(--ambient-4)")} />
    </div>
  );
}
