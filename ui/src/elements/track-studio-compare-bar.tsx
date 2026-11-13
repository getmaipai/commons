"use client";

// The A/B player of TrackStudio's Compare (audio): one <audio> element that plays the earlier version or the current one from the same
// place, so switching is a change of source at the same second. Owned by the Element: paused, emptied and removed when it closes.

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon, XIcon } from "lucide-react";
import { Button } from "@/kit/ui/button";
import { i18n } from "@/kit/i18n";
import { eyebrow } from "./surfaces";
import type { StudioComparePair } from "./track-studio-compare";

export interface StudioCompareBarProps { pair: StudioComparePair; startAt: number; onClose: () => void }

export function StudioCompareBar({ pair, startAt, onClose }: StudioCompareBarProps) {
  const [side, setSide] = useState<"before" | "after">("after");
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const resume = useRef<{ at: number; play: boolean }>({ at: startAt, play: false });
  const url = side === "before" ? pair.before_url : pair.after_url;

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const { at, play } = resume.current;
    const go = () => {
      try { el.currentTime = at; } catch { /* not seekable yet */ }
      if (play) void el.play()?.catch?.(() => setPlaying(false));
    };
    el.addEventListener("loadedmetadata", go, { once: true });
    el.src = url;
    try { el.load(); } catch { /* jsdom */ }
    return () => el.removeEventListener("loadedmetadata", go);
  }, [url]);
  useEffect(() => () => {
    const el = audio.current;
    if (!el) return;
    try { el.pause(); } catch { /* gone */ }
    el.removeAttribute("src");
    try { el.load(); } catch { /* jsdom */ }
  }, []);

  const pick = (next: "before" | "after") => {
    if (next === side) return;
    const el = audio.current;
    resume.current = { at: el?.currentTime ?? resume.current.at, play: !!el && !el.paused };
    setSide(next);
  };
  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) { resume.current.play = true; void el.play()?.catch?.(() => setPlaying(false)); } else { resume.current.play = false; el.pause(); }
  };
  const A = i18n._({ id: "ui.Before", message: "Before" });
  const B = i18n._({ id: "ui.After", message: "After" });
  return (
    <div className="bg-card flex min-w-0 flex-wrap items-center gap-3 rounded-2xl p-3" data-slot="track-studio-compare">
      <h3 className={eyebrow}>{i18n._({ id: "ui.Compare", message: "Compare" })}</h3>
      {/* A song has no captions to draw; this element only plays. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audio} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} data-slot="track-studio-compare-audio" />
      <Button size="sm" className="rounded-full" onClick={toggle} aria-label={playing ? i18n._({ id: "ui.Pause", message: "Pause" }) : i18n._({ id: "ui.Play", message: "Play" })}>{playing ? <PauseIcon /> : <PlayIcon />}{playing ? i18n._({ id: "ui.Pause", message: "Pause" }) : i18n._({ id: "ui.Play", message: "Play" })}</Button>
      <div role="radiogroup" aria-label={i18n._({ id: "ui.Version to hear", message: "Version to hear" })} className="flex gap-1">
        <Button variant={side === "before" ? "default" : "secondary"} size="sm" role="radio" aria-checked={side === "before"} className="rounded-full" onClick={() => pick("before")}>{A}</Button>
        <Button variant={side === "after" ? "default" : "secondary"} size="sm" role="radio" aria-checked={side === "after"} className="rounded-full" onClick={() => pick("after")}>{B}</Button>
      </div>
      <p className="text-muted-foreground min-w-0 flex-1 text-sm" role="status">{side === "before" ? (pair.label ?? i18n._({ id: "ui.The earlier version", message: "The earlier version" })) : i18n._({ id: "ui.The current version", message: "The current version" })}</p>
      <Button variant="secondary" size="sm" className="rounded-full" onClick={onClose}><XIcon />{i18n._({ id: "ui.Close compare", message: "Close compare" })}</Button>
    </div>
  );
}
