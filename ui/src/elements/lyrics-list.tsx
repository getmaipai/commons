"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Button } from "@/kit/ui/button";
import { Progress } from "@/kit/ui/progress";
import { EmptyState } from "@/kit/primitives/EmptyState";

// distance 0 is sharp and full strength; each step adds blur and fades. Hover and focus clear it. The change eases only
// when motion is allowed.
const BLUR_CLASSES = "[filter:blur(calc(min(var(--lyric-distance),var(--lyrics-distance-max))*var(--lyrics-blur-step)))] [opacity:calc(1-min(var(--lyric-distance),var(--lyrics-distance-max))*var(--lyrics-fade-step))] hover:[filter:none] hover:opacity-100 focus-visible:[filter:none] focus-visible:opacity-100 motion-safe:transition-[filter,opacity] motion-safe:duration-300";

export interface LyricWord { t: number; end: number; text: string }
export interface TimedLyricLine { t: number; line: string; section?: string | null; words?: readonly LyricWord[]; secondary?: string }

/** A line lights this many seconds early so the eye is ready. Word fill does not use it. */
export const LYRIC_LEAD_S = 0.55;
const SEEK_BACK_S = 0.75;
const COUNT_IN_S = 3;

/** The active index never steps back while playing; a lower index is accepted only after a real seek (time moved back by more than 0.75 s). */
export function nextActiveIndex(prevIndex: number, prevTime: number, rawIndex: number, time: number): number {
  if (rawIndex >= prevIndex) return rawIndex;
  return prevTime - time > SEEK_BACK_S ? rawIndex : prevIndex;
}

function wordFill(w: LyricWord, time: number): number {
  if (time <= w.t) return 0;
  if (time >= w.end || w.end <= w.t) return 1;
  return (time - w.t) / (w.end - w.t);
}

const WORD_CLASS = "bg-clip-text text-transparent [background-image:linear-gradient(to_right,var(--foreground)_calc(var(--word-fill)*100%),var(--muted-foreground)_calc(var(--word-fill)*100%))]";
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
  const lead = currentTime + LYRIC_LEAD_S;
  const rawIndex = lines?.findIndex((entry, i) => entry.t <= lead && (!lines[i + 1] || lead < lines[i + 1]!.t)) ?? -1;
  const prev = useRef({ index: -1, time: 0 });
  const activeIndex = Math.min(nextActiveIndex(prev.current.index, prev.current.time, rawIndex, currentTime), (lines?.length ?? 0) - 1);
  prev.current = { index: activeIndex, time: currentTime };
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!activeRef.current || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    activeRef.current.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);
  if (lines?.length) return <ol aria-label={labels.label} className="space-y-1">
    {lines.map(({ t, line, section, words, secondary }, i) => {
      const before = lines[i - 1];
      const prevEnd = before ? (before.words?.length ? before.words[before.words.length - 1]!.end : before.t + 2) : 0;
      const countStart = t - COUNT_IN_S;
      const showCount = !!before && t - prevEnd >= 2 && lead >= Math.max(prevEnd, countStart) && lead < t;
      const countValue = showCount ? ((lead - Math.max(prevEnd, countStart)) / (t - Math.max(prevEnd, countStart))) * 100 : 0;
      const wiping = i === activeIndex && !!words?.length;
      return <li key={`${t}-${i}`}>
      {showCount ? <Progress aria-hidden="true" value={countValue} className="mx-4 my-1 w-16" /> : null}
      {section && section !== lines[i - 1]?.section ? <p role="heading" aria-level={3} className="text-muted-foreground pt-2 text-xs">{section}</p> : null}
      <Button ref={i === activeIndex ? activeRef : undefined} type="button" variant="ghost" data-distance={blurByDistance ? lyricDistance(i, activeIndex) : undefined} style={blurByDistance ? ({ "--lyric-distance": lyricDistance(i, activeIndex) } as CSSProperties) : undefined} className={`h-auto w-full justify-start whitespace-pre-wrap py-2 text-left ${largeCurrent && i === activeIndex ? "text-2xl font-semibold text-foreground" : largeCurrent ? "text-muted-foreground" : ""}${blurByDistance && activeIndex >= 0 ? ` ${BLUR_CLASSES}` : ""}`} aria-current={i === activeIndex ? "true" : undefined} aria-label={wiping || secondary ? line : undefined} onClick={() => onSeek?.(t)}>{wiping ? words!.map((w, k) => {
        const fill = reduced ? (currentTime >= w.t && currentTime < w.end ? 1 : 0) : wordFill(w, currentTime);
        const gap = k > 0 && !/\s$/.test(words![k - 1]!.text) && !/^\s/.test(w.text) ? " " : "";
        return <span key={k}>{gap}<span data-word="" className={WORD_CLASS} style={{ "--word-fill": fill } as CSSProperties}>{w.text}</span></span>;
      }) : line}{secondary ? <span className="text-muted-foreground block text-sm font-normal">{secondary}</span> : null}</Button>
    </li>;
    })}
  </ol>;
  if (text) return <pre aria-label={labels.label} className="whitespace-pre-wrap font-sans text-sm">{text}</pre>;
  return <EmptyState icon="music" text={labels.empty ?? labels.label} />;
}
