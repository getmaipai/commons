"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "cn";
import { getIcon } from "../icons";
import { SafeImage } from "../primitives/SafeImage";
import { i18n } from "@/kit/i18n";
import { Skeleton } from "../ui/skeleton";
import { EmptyState } from "../primitives/EmptyState";

export type StoryboardShotStatus = "ready" | "no_picture" | "changing";

export interface StoryboardLine {
  /** Who speaks (a persona name). */
  speaker: string;
  text: string;
  /** Seconds after the start of the shot when the voice begins. Default 0. */
  startSec?: number;
  /** The voice for this line. Without it the line is shown as text only. */
  audioSrc?: string;
  /** Loudness samples from 0 to 1 (or any positive numbers: they are scaled to the largest) for the strip's small waveform. */
  wave?: number[];
}

export interface StoryboardShot {
  id: string;
  caption: string;
  durationSec: number;
  /** The picture shown for the whole shot. */
  still?: string;
  /** A video for the shot; it plays over the still while the shot plays. */
  clip?: string;
  /** `ready` (default), `no_picture` (calm placeholder) or `changing` (the picture is being redone). */
  status?: StoryboardShotStatus;
  framing?: string;
  place?: string;
  roomSound?: string;
  changedBy?: string;
  reading?: { index: number; count: number };
  line?: StoryboardLine;
}

export interface StoryboardPlayerLabels {
  play: string;
  pause: string;
  /** Names the shot strip. */
  shots: string;
  /** Names the scrub bar. */
  scrub: string;
  noPicture: string;
  changing: string;
  loading: string;
  /** Said when the list is empty: what to do next. */
  empty: string;
  /** The scrub bar's spoken value: "Shot 2 of 6, 0:14". */
  scrubValue: (shot: number, count: number, time: string) => string;
  /** The name of one strip item: "Shot 2: caption, 5 seconds". */
  shotName: (shot: number, caption: string, seconds: number) => string;
  /** A shot's length on its thumbnail: "5s". */
  shotLength: (seconds: number) => string;
  /** Names a still when the shot has a caption. */
  stillAlt: (caption: string) => string;
}

export const defaultStoryboardLabels = (): StoryboardPlayerLabels => ({
  play: i18n._({ id: "ui.Play", message: "Play" }),
  pause: i18n._({ id: "ui.Pause", message: "Pause" }),
  shots: i18n._({ id: "ui.Shots", message: "Shots" }),
  scrub: i18n._({ id: "ui.Storyboard position", message: "Storyboard position" }),
  noPicture: i18n._({ id: "ui.No picture yet", message: "No picture yet" }),
  changing: i18n._({ id: "ui.Changing this shot", message: "Changing this shot" }),
  loading: i18n._({ id: "ui.Loading the storyboard", message: "Loading the storyboard" }),
  empty: i18n._({ id: "ui.No shots yet. Add a shot to start your storyboard.", message: "No shots yet. Add a shot to start your storyboard." }),
  scrubValue: (shot, count, time) => i18n._({ id: "ui.Shot {shot} of {count}, {time}", message: "Shot {shot} of {count}, {time}", values: { shot, count, time } }),
  shotName: (shot, caption, seconds) => i18n._({ id: "ui.Shot {shot}: {caption}, {seconds} seconds", message: "Shot {shot}: {caption}, {seconds} seconds", values: { shot, caption, seconds } }),
  shotLength: (seconds) => i18n._({ id: "ui.{seconds}s", message: "{seconds}s", values: { seconds } }),
  stillAlt: (caption) => i18n._({ id: "ui.Picture for: {caption}", message: "Picture for: {caption}", values: { caption } }),
});

export interface StoryboardPlayerProps {
  shots: readonly StoryboardShot[];
  /** A bed track (music or room sound) that plays under the whole storyboard. */
  bedSrc?: string;
  affectedShotIds?: string[];
  note?: string;
  /** The selected shot id. Leave it out and the player keeps its own. */
  value?: string;
  onValueChange?: (shotId: string) => void;
  /** Called with the position in seconds each time it moves. */
  onTimeChange?: (sec: number) => void;
  loading?: boolean;
  labels?: Partial<StoryboardPlayerLabels>;
  className?: string;
}

/** `m:ss` for a position in seconds. */
export function formatStoryboardTime(sec: number): string {
  const whole = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const TICK_MS = 50;
const KEY_STEP_SEC = 1;
const DRIFT_SEC = 0.4;
const MAX_BARS = 28;

const safeDuration = (shot: StoryboardShot) => (Number.isFinite(shot.durationSec) && shot.durationSec > 0 ? shot.durationSec : 0);

/** Downsample to at most `MAX_BARS` bars, each 0..1 of the tallest. */
function waveBars(wave: readonly number[]): number[] {
  const clean = wave.map((n) => (Number.isFinite(n) && n > 0 ? n : 0));
  if (clean.length === 0) return [];
  const step = Math.max(1, Math.ceil(clean.length / MAX_BARS));
  const bars: number[] = [];
  for (let i = 0; i < clean.length; i += step) bars.push(Math.max(...clean.slice(i, i + step)));
  const top = Math.max(...bars, 0);
  return top > 0 ? bars.map((n) => n / top) : bars.map(() => 0);
}

function Wave({ wave }: { wave: readonly number[] }) {
  const bars = waveBars(wave);
  return (
    <span data-slot="storyboard-wave" aria-hidden className="flex h-4 items-center gap-px">
      {bars.map((n, i) => <span key={i} className="w-[2px] rounded-full bg-[var(--primary)]" style={{ height: `${Math.max(12, Math.round(n * 100))}%` }} />)}
    </span>
  );
}

function playMedia(el: HTMLMediaElement) {
  if (typeof el.play !== "function") return;
  try { void Promise.resolve(el.play()).catch(() => {}); } catch { /* a blocked play stays paused; the Play button starts it */ }
}

/** Keep one media element on the storyboard clock: playing only while `playing` and the clock is inside `[0, length)` of that element, and within DRIFT_SEC of its own position. */
function followClock(el: HTMLMediaElement | null, offset: number, playing: boolean) {
  if (!el) return;
  const length = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : Infinity;
  if (playing && offset >= 0 && offset < length) {
    if (Math.abs(el.currentTime - offset) > DRIFT_SEC) el.currentTime = offset;
    if (el.paused) playMedia(el);
  } else {
    if (!el.paused && typeof el.pause === "function") el.pause();
    if (!playing && offset >= 0 && Math.abs(el.currentTime - offset) > DRIFT_SEC && offset < length) el.currentTime = offset;
  }
}

/** A storyboard that plays: stills (or clips) for their length, a voice line per shot, an optional bed, a scrub bar with a tick at each shot, and a strip of shots. */
export function StoryboardPlayer({ shots, bedSrc, affectedShotIds, note, value, onValueChange, onTimeChange, loading = false, labels, className }: StoryboardPlayerProps) {
  const text = { ...defaultStoryboardLabels(), ...labels };
  const starts = useMemo(() => {
    let at = 0;
    return shots.map((shot) => { const start = at; at += safeDuration(shot); return start; });
  }, [shots]);
  const total = useMemo(() => shots.reduce((sum, shot) => sum + safeDuration(shot), 0), [shots]);
  const indexAt = useCallback((sec: number) => {
    for (let i = shots.length - 1; i >= 0; i--) if (sec >= starts[i]! && (sec < starts[i]! + safeDuration(shots[i]!) || i === shots.length - 1)) return i;
    return 0;
  }, [shots, starts]);

  const [rawTime, setTime] = useState(() => {
    const first = value === undefined ? -1 : shots.findIndex((s) => s.id === value);
    return first >= 0 ? starts[first]! : 0;
  });
  const [playing, setPlaying] = useState(false);
  const time = Math.min(Math.max(rawTime, 0), total);
  const index = indexAt(time);
  const shot = shots[index];
  const shotStart = starts[index] ?? 0;

  const lineAudio = useRef<HTMLAudioElement>(null);
  const bedAudio = useRef<HTMLAudioElement>(null);
  const clipVideo = useRef<HTMLVideoElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const scrub = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // The clock.
  useEffect(() => {
    if (!playing || total <= 0) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => Math.min(total, t + dt));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, total]);
  useEffect(() => { if (playing && total > 0 && time >= total) setPlaying(false); }, [playing, time, total]);

  // Report the position.
  const lastReported = useRef(time);
  useEffect(() => {
    if (lastReported.current === time) return;
    lastReported.current = time;
    onTimeChange?.(time);
  }, [time, onTimeChange]);

  // Selection: report the shot the clock is in, and follow an outside `value`.
  const lastShotId = useRef(shot?.id);
  useEffect(() => {
    const id = shot?.id;
    if (id === lastShotId.current) return;
    lastShotId.current = id;
    if (id !== undefined && id !== value) onValueChange?.(id);
  }, [shot?.id, value, onValueChange]);
  useEffect(() => {
    if (value === undefined || value === shot?.id) return;
    const at = shots.findIndex((s) => s.id === value);
    if (at >= 0) setTime(starts[at]!);
    // Only an outside change of `value` moves the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Keep the audio and video on the clock.
  const line = shot?.line;
  useEffect(() => {
    followClock(lineAudio.current, line?.audioSrc ? time - shotStart - (line.startSec ?? 0) : -1, playing);
    followClock(bedAudio.current, bedSrc ? time : -1, playing && time < total);
    followClock(clipVideo.current, shot?.clip ? time - shotStart : -1, playing);
  }, [time, playing, shot?.clip, shotStart, line?.audioSrc, line?.startSec, bedSrc, total]);

  // Keep the selected strip item in view without moving the page.
  useEffect(() => {
    const list = strip.current;
    const item = list?.children[index] as HTMLElement | undefined;
    if (!list || !item) return;
    const left = item.offsetLeft;
    if (left < list.scrollLeft || left + item.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollLeft = Math.max(0, left - 8);
  }, [index]);

  const seek = useCallback((sec: number) => setTime(Math.min(Math.max(sec, 0), total)), [total]);
  const selectShot = (i: number) => seek(starts[i] ?? 0);
  const toggle = () => {
    if (total <= 0) return;
    if (!playing && time >= total) setTime(0);
    setPlaying((p) => !p);
  };

  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    const rtl = typeof getComputedStyle === "function" && getComputedStyle(event.currentTarget).direction === "rtl";
    const along = rtl ? box.right - event.clientX : event.clientX - box.left;
    seek((along / box.width) * total);
  };
  const onScrubKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    let next: number | null = null;
    if (key === "ArrowRight" || key === "ArrowUp") next = time + KEY_STEP_SEC;
    else if (key === "ArrowLeft" || key === "ArrowDown") next = time - KEY_STEP_SEC;
    else if (key === "PageDown") next = starts[Math.min(index + 1, shots.length - 1)] ?? time;
    else if (key === "PageUp") next = time - shotStart > 1 ? shotStart : starts[Math.max(index - 1, 0)] ?? 0;
    else if (key === "Home") next = 0;
    else if (key === "End") next = total;
    if (next === null) return;
    event.preventDefault();
    seek(next);
  };

  if (loading) {
    return (
      <div data-slot="storyboard-player" data-state="loading" role="status" aria-busy="true" aria-label={text.loading} className={cn("flex w-full flex-col gap-3", className)}>
        <Skeleton animation="pulse" className="aspect-video w-full rounded-[var(--radius-card)] motion-reduce:animate-none" />
        <Skeleton animation="pulse" className="h-14 w-full motion-reduce:animate-none" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} animation="pulse" className="aspect-video w-[132px] shrink-0 motion-reduce:animate-none" />)}
        </div>
      </div>
    );
  }
  if (shots.length === 0) {
    return (
      <div data-slot="storyboard-player" data-state="empty" className={cn("flex aspect-video w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-card)]", className)}>
        <EmptyState icon="clapperboard" text={text.empty} />
      </div>
    );
  }

  const PlayIcon = getIcon(playing ? "pause" : "play");
  const ImageIcon = getIcon("image");
  const MicIcon = getIcon("mic");
  const status = shot?.status ?? "ready";
  const pct = total > 0 ? (time / total) * 100 : 0;
  // No shot has a picture or a clip yet: the stage is one quiet line, not a tall empty box.
  const nothingDrawn = shots.length > 0 && shots.every((s) => !s.still && !s.clip);

  return (
    <div data-slot="storyboard-player" data-state={playing ? "playing" : "paused"} className={cn("flex w-full flex-col gap-3", className)}>
      <div data-slot="storyboard-stage" data-bare={nothingDrawn ? "" : undefined} className={cn("relative w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-stage)]", nothingDrawn ? "h-16" : "aspect-video")}>
        {shot?.still && status !== "no_picture" ? (
          <SafeImage src={shot.still} alt={text.stillAlt(shot.caption)} tintSeed={shot.caption} className={cn("absolute inset-0 size-full object-cover transition-opacity motion-reduce:transition-none", status === "changing" && "opacity-40")} />
        ) : null}
        {shot?.clip && status === "ready" ? (
          <video ref={clipVideo} src={shot.clip} poster={shot.still} muted playsInline preload="auto" aria-hidden className="absolute inset-0 size-full object-cover" />
        ) : null}
        {status === "no_picture" || (!shot?.still && !shot?.clip) ? (
          <div data-slot="storyboard-no-picture" className={cn("absolute inset-0 flex items-center justify-center bg-[var(--surface-2)] text-[var(--muted-foreground)]", nothingDrawn ? "flex-row gap-2" : "flex-col gap-2")}>
            <ImageIcon className={nothingDrawn ? "size-5" : "size-10"} aria-hidden />
            <p className="text-sm">{text.noPicture}</p>
          </div>
        ) : null}
        {status === "changing" ? (
          <div data-slot="storyboard-changing" role="status" className="absolute inset-0 flex items-center justify-center bg-[var(--surface-2)]/60">
            <span className="animate-pulse rounded-full bg-[var(--surface-card)] px-3 py-1.5 text-sm text-[var(--foreground)] motion-reduce:animate-none">{text.changing}</span>
          </div>
        ) : null}
        {/* The spoken line is also on screen as text under the stage, and the bed is music. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={lineAudio} src={line?.audioSrc} preload="auto" />
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={bedAudio} src={bedSrc} preload="auto" />
      </div>

      <div data-slot="storyboard-caption" className="min-h-[3rem] text-[var(--foreground)]">
        {line ? (
          <p className="text-base"><span className="me-2 font-semibold">{line.speaker}</span><span>{line.text}</span></p>
        ) : (
          <p className="text-base text-[var(--muted-foreground)]">{shot?.caption}</p>
        )}
        {note ? <p data-slot="storyboard-note" className="text-sm text-[var(--muted-foreground)]">{note}</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? text.pause : text.play}
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none"
        >
          <PlayIcon className="size-6" aria-hidden />
        </button>
        <span data-slot="storyboard-time" className="shrink-0 text-sm tabular-nums text-[var(--muted-foreground)]">
          <span className="text-[var(--foreground)]">{formatStoryboardTime(time)}</span> / {formatStoryboardTime(total)}
        </span>
        <div
          ref={scrub}
          role="slider"
          tabIndex={0}
          aria-label={text.scrub}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={text.scrubValue(index + 1, shots.length, formatStoryboardTime(time))}
          onKeyDown={onScrubKey}
          onPointerDown={(event) => {
            dragging.current = true;
            try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* capture is a nicety */ }
            seekFromPointer(event);
          }}
          onPointerMove={(event) => { if (dragging.current) seekFromPointer(event); }}
          onPointerUp={() => { dragging.current = false; }}
          onPointerCancel={() => { dragging.current = false; }}
          className="group relative flex h-12 min-w-0 flex-1 cursor-pointer touch-none items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <div className="relative h-2 w-full rounded-full bg-[var(--muted)]">
            <div data-slot="storyboard-scrub-fill" className="absolute inset-y-0 start-0 rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
            {starts.slice(1).map((start, i) => (
              <span key={shots[i + 1]!.id} data-slot="storyboard-tick" aria-hidden className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--foreground)]/40" style={{ insetInlineStart: `${total > 0 ? (start / total) * 100 : 0}%` }} />
            ))}
            <span data-slot="storyboard-thumb" aria-hidden className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-[var(--primary)] bg-[var(--background)] shadow-sm" style={{ insetInlineStart: `calc(${pct}% - 0.5rem)` }} />
          </div>
        </div>
      </div>

      <ol ref={strip} data-slot="storyboard-strip" aria-label={text.shots} className="m-0 flex list-none snap-x gap-3 overflow-x-auto p-0 pb-2">
        {shots.map((item, i) => {
          const selected = i === index;
          const itemStatus = affectedShotIds?.includes(item.id) ? "changing" : item.status ?? "ready";
          const length = safeDuration(item);
          const done = selected && length > 0 ? Math.min(1, Math.max(0, (time - starts[i]!) / length)) : 0;
          return (
            <li key={item.id} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => selectShot(i)}
                aria-current={selected ? "true" : undefined}
                aria-label={text.shotName(i + 1, item.caption, Math.round(length))}
                data-selected={selected ? "true" : undefined}
                className={cn(
                  "flex min-h-[48px] w-[132px] flex-col gap-1 rounded-[var(--radius-thumb,0.75rem)] border p-1 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-reduce:transition-none",
                  selected ? "border-[var(--primary)] bg-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-card)] hover:bg-[var(--accent)]",
                )}
              >
                <span className="relative block aspect-video w-full overflow-hidden rounded-[calc(var(--radius-thumb,0.75rem)-4px)] bg-[var(--surface-2)]">
                  {item.still && itemStatus !== "no_picture" ? <SafeImage src={item.still} alt="" aria-hidden tintSeed={item.caption} className={cn("absolute inset-0 size-full object-cover", itemStatus === "changing" && "opacity-40")} /> : (
                    <span className="absolute inset-0 flex items-center justify-center text-[var(--muted-foreground)]"><ImageIcon className="size-5" aria-hidden /></span>
                  )}
                  <span aria-hidden className="absolute start-1 top-1 rounded-full bg-[var(--background)] px-1.5 text-xs font-semibold tabular-nums text-[var(--foreground)]">{i + 1}</span>
                  <span aria-hidden className="absolute end-1 top-1 rounded-full bg-[var(--background)] px-1.5 text-xs tabular-nums text-[var(--muted-foreground)]">{text.shotLength(Math.round(length))}</span>
                  {selected ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--muted)]"><span className="block h-full bg-[var(--primary)]" style={{ width: `${done * 100}%` }} /></span> : null}
                </span>
                <span className="flex h-5 items-center gap-1 px-1 text-[var(--primary)]">
                  {item.line?.wave && item.line.wave.length > 0 ? <Wave wave={item.line.wave} /> : item.line ? <MicIcon data-slot="storyboard-line-marker" className="size-3.5" aria-hidden /> : null}
                </span>
                {item.framing || item.place ? <span data-slot="storyboard-shot-context" className="max-w-full truncate px-1 text-xs text-[var(--muted-foreground)]">{[item.framing, item.place].filter(Boolean).join(" · ")}</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
