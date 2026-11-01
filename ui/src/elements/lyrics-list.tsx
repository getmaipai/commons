"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Button } from "@/kit/ui/button";
import { EmptyState } from "@/kit/primitives/EmptyState";

// distance 0 is sharp and full strength; each step adds blur and fades. Hover and focus clear it. The change eases only
// when motion is allowed.
const BLUR_CLASSES = "[filter:blur(calc(min(var(--lyric-distance),var(--lyrics-distance-max))*var(--lyrics-blur-step)))] [opacity:calc(1-min(var(--lyric-distance),var(--lyrics-distance-max))*var(--lyrics-fade-step))] hover:[filter:none] hover:opacity-100 focus-visible:[filter:none] focus-visible:opacity-100 motion-safe:transition-[filter,opacity] motion-safe:duration-300";

export interface TimedLyricLine { t: number; line: string; section?: string | null }
export interface LyricsListProps {
  lines?: readonly TimedLyricLine[];
  text?: string;
  currentTime?: number;
  onSeek?: (time: number) => void;
  labels?: { label: string; empty?: string };
  largeCurrent?: boolean;
  /** MUSIC-KIT-01: lines away from the active one blur and fade more the farther they are (up to
   * `--lyrics-distance-max` lines; step sizes are `--lyrics-blur-step` and `--lyrics-fade-step`). A line clears on
   * hover or keyboard focus so it stays readable and tappable. Needs timed `lines`; plain text is unchanged.
   * Default off. Implies the dimmed look of `largeCurrent` for the other lines. */
  blurByDistance?: boolean;
}

/** How many lines a line is from the active one; 0 for the active line, and 0 for every line when none is active. */
export function lyricDistance(index: number, activeIndex: number): number {
  return activeIndex < 0 ? 0 : Math.abs(index - activeIndex);
}

export function LyricsList({ lines, text, currentTime = 0, onSeek, labels = { label: "Lyrics" }, largeCurrent = false, blurByDistance = false }: LyricsListProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const activeIndex = lines?.findIndex((entry, i) => entry.t <= currentTime && (!lines[i + 1] || currentTime < lines[i + 1]!.t)) ?? -1;
  useEffect(() => {
    if (!activeRef.current || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    activeRef.current.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);
  if (lines?.length) return <ol aria-label={labels.label} className="space-y-1">
    {lines.map(({ t, line, section }, i) => <li key={`${t}-${i}`}>
      {section && section !== lines[i - 1]?.section ? <p role="heading" aria-level={3} className="text-muted-foreground pt-2 text-xs">{section}</p> : null}
      <Button ref={i === activeIndex ? activeRef : undefined} type="button" variant="ghost" data-distance={blurByDistance ? lyricDistance(i, activeIndex) : undefined} style={blurByDistance ? ({ "--lyric-distance": lyricDistance(i, activeIndex) } as CSSProperties) : undefined} className={`h-auto w-full justify-start whitespace-pre-wrap py-2 text-left ${largeCurrent && i === activeIndex ? "text-2xl font-semibold text-foreground" : largeCurrent ? "text-muted-foreground" : ""}${blurByDistance && activeIndex >= 0 ? ` ${BLUR_CLASSES}` : ""}`} aria-current={i === activeIndex ? "true" : undefined} onClick={() => onSeek?.(t)}>{line}</Button>
    </li>)}
  </ol>;
  if (text) return <pre aria-label={labels.label} className="whitespace-pre-wrap font-sans text-sm">{text}</pre>;
  return <EmptyState icon="music" text={labels.empty ?? labels.label} />;
}
