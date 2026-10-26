"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/kit/ui/button";
import { EmptyState } from "@/kit/primitives/EmptyState";

export interface TimedLyricLine { t: number; line: string; section?: string | null }
export interface LyricsListProps {
  lines?: readonly TimedLyricLine[];
  text?: string;
  currentTime?: number;
  onSeek?: (time: number) => void;
  labels?: { label: string; empty?: string };
  largeCurrent?: boolean;
}

export function LyricsList({ lines, text, currentTime = 0, onSeek, labels = { label: "Lyrics" }, largeCurrent = false }: LyricsListProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const activeIndex = lines?.findIndex((entry, i) => entry.t <= currentTime && (!lines[i + 1] || currentTime < lines[i + 1]!.t)) ?? -1;
  useEffect(() => {
    if (!activeRef.current || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    activeRef.current.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);
  if (lines?.length) return <ol aria-label={labels.label} className="space-y-1">
    {lines.map(({ t, line, section }, i) => <li key={`${t}-${i}`}>
      {section && section !== lines[i - 1]?.section ? <p role="heading" aria-level={3} className="text-muted-foreground pt-2 text-xs">{section}</p> : null}
      <Button ref={i === activeIndex ? activeRef : undefined} type="button" variant="ghost" className={`h-auto w-full justify-start whitespace-pre-wrap py-2 text-left ${largeCurrent && i === activeIndex ? "text-2xl font-semibold text-foreground" : largeCurrent ? "text-muted-foreground" : ""}`} aria-current={i === activeIndex ? "true" : undefined} onClick={() => onSeek?.(t)}>{line}</Button>
    </li>)}
  </ol>;
  if (text) return <pre aria-label={labels.label} className="whitespace-pre-wrap font-sans text-sm">{text}</pre>;
  return <EmptyState icon="music" text={labels.empty ?? labels.label} />;
}
