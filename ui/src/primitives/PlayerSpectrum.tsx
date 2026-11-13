import { useEffect, useRef } from "react";

/** The Player's optional spectrum: bars rise from the bottom edge across the full width of the mini bar. The host owns the
 * analyser and hands over `levels()`; the kit only draws. Colour is the theme's accent token, drawn faint. */

/** Draw one frame of bars (levels 0..1, left to right) onto `ctx`. Pure apart from the canvas calls. */
export function drawSpectrum(ctx: Pick<CanvasRenderingContext2D, "clearRect" | "fillRect" | "fillStyle" | "globalAlpha">, width: number, height: number, levels: readonly number[], color: string, alpha = 0.18): void {
  ctx.clearRect(0, 0, width, height);
  const n = levels.length;
  if (n === 0 || width <= 0 || height <= 0) return;
  const slot = width / n;
  const gap = Math.min(2, slot * 0.25);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const v = Number.isFinite(levels[i]) ? Math.max(0, Math.min(1, levels[i]!)) : 0;
    const h = v * height;
    if (h <= 0) continue;
    ctx.fillRect(i * slot + gap / 2, height - h, Math.max(1, slot - gap), h);
  }
  ctx.globalAlpha = 1;
}

export interface PlayerSpectrumProps {
  levels: () => readonly number[];
  /** Drawing runs only while true (the player is playing). */
  active: boolean;
}

export function PlayerSpectrum({ levels, active }: PlayerSpectrumProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext?.("2d") ?? null;
    if (!canvas || !ctx) return;
    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);
      const color = getComputedStyle(canvas).getPropertyValue("--progress-accent").trim() || getComputedStyle(canvas).color;
      let values: readonly number[] = [];
      try { values = levelsRef.current(); } catch { /* a failing analyser draws nothing */ }
      drawSpectrum(ctx, w, h, values, color);
    };
    const clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active) { clear(); return; }
    if (reduced) { paint(); return; }

    let raf = 0;
    let skip = false;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      // Half the frame rate while the window is unfocused.
      if (typeof document.hasFocus === "function" && !document.hasFocus()) {
        skip = !skip;
        if (skip) return;
      }
      paint();
    };
    const start = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const onVisibility = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => { document.removeEventListener("visibilitychange", onVisibility); stop(); clear(); };
  }, [active]);

  return <canvas ref={ref} aria-hidden data-slot="player-spectrum" className="pointer-events-none absolute inset-0 z-0 size-full text-primary" />;
}
