"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/kit/utils";
import { loadArtColors, meanColor } from "@/kit/primitives/AmbientGlow";

/** PARITY-01: a static gradient behind a header or a player area, taken from the dominant color of `art` (the same
 * sampler as AmbientGlow). Presentational (`aria-hidden`), drawn behind its parent (`-z-10`, so the parent needs
 * `relative isolate`), and never animated: it simply fades in once the color is read. While the art is missing or cannot
 * be read it uses the theme's `--muted` token, so a theme and its dark mode always give a readable page. */
export function ArtGradient({ art, className }: { art?: string | null; className?: string }) {
  const [tint, setTint] = useState<string | null>(null);
  useEffect(() => {
    setTint(null);
    if (!art) return;
    let dead = false;
    void loadArtColors(art).then((colors) => { if (!dead && colors) setTint(meanColor(colors)); });
    return () => { dead = true; };
  }, [art]);
  const style = { "--art-gradient-tint": tint ?? "var(--muted)" } as CSSProperties;
  return (
    <div
      aria-hidden="true"
      data-slot="art-gradient"
      data-ready={tint ? "true" : "false"}
      style={style}
      className={cn("pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] max-h-full bg-gradient-to-b from-[color-mix(in_srgb,var(--art-gradient-tint)_60%,transparent)] to-transparent motion-safe:transition-opacity", className)}
    />
  );
}
