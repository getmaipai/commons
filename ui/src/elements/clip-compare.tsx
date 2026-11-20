"use client";

/**
 * K8: a before and after compare for clips (and stills). Two sides in one of two modes: side by side (two panes, stacked
 * at phone width, before above after) or a wipe (one frame split by a draggable handle). One play button, one scrub bar
 * and one unmute button drive both videos, which are kept on the same time. Muted until the person unmutes; only one
 * side's sound plays at a time (the after side, or in a wipe the side the handle shows more of) so the two never double.
 * Stills show with no transport. Tokens only.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "cn";
import { getIcon } from "../icons";
import { SafeImage } from "../primitives/SafeImage";
import { formatTime } from "../primitives/playerLogic";
import { i18n } from "@/kit/i18n";
import { Skeleton } from "../ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/kit/ui/toggle-group";

/** One side of the compare. `label` replaces the default "Before" or "After" pill. */
export interface ClipCompareSide {
  src: string;
  kind: "video" | "image";
  label?: string;
  /** A picture shown until the video has a frame. */
  poster?: string;
}

export type ClipCompareMode = "side_by_side" | "wipe";

/** The words the compare draws; each defaults to the kit's catalog text. */
export interface ClipCompareCopy {
  before?: string;
  after?: string;
  modeLabel?: string;
  sideBySide?: string;
  wipe?: string;
  wipeHandle?: string;
  play?: string;
  pause?: string;
  mute?: string;
  unmute?: string;
  position?: string;
  loading?: string;
  error?: string;
  /** The handle's spoken value, given the percent of the before side showing. */
  wipeValue?: (percent: number) => string;
  /** The scrub bar's spoken value. */
  positionValue?: (time: string, total: string) => string;
}

const defaultCopy = (): Required<ClipCompareCopy> => ({
  before: i18n._({ id: "ui.Before", message: "Before" }),
  after: i18n._({ id: "ui.After", message: "After" }),
  modeLabel: i18n._({ id: "ui.Compare view", message: "Compare view" }),
  sideBySide: i18n._({ id: "ui.Side by side", message: "Side by side" }),
  wipe: i18n._({ id: "ui.Wipe", message: "Wipe" }),
  wipeHandle: i18n._({ id: "ui.Before and after divider", message: "Before and after divider" }),
  play: i18n._({ id: "ui.Play", message: "Play" }),
  pause: i18n._({ id: "ui.Pause", message: "Pause" }),
  mute: i18n._({ id: "ui.Mute", message: "Mute" }),
  unmute: i18n._({ id: "ui.Unmute", message: "Unmute" }),
  position: i18n._({ id: "ui.Clip position", message: "Clip position" }),
  loading: i18n._({ id: "ui.Loading the clips", message: "Loading the clips" }),
  error: i18n._({ id: "ui.One of the two clips did not load. Reload this page or open the clip from the Library.", message: "One of the two clips did not load. Reload this page or open the clip from the Library." }),
  wipeValue: (percent) => i18n._({ id: "ui.Showing {percent}% of the before", message: "Showing {percent}% of the before", values: { percent } }),
  positionValue: (time, total) => i18n._({ id: "ui.{time} of {total}", message: "{time} of {total}", values: { time, total } }),
});

export interface ClipCompareProps {
  before: ClipCompareSide;
  after: ClipCompareSide;
  /** The view. Leave it out and the compare keeps its own, starting at `side_by_side`. */
  mode?: ClipCompareMode;
  onModeChange?: (mode: ClipCompareMode) => void;
  /** Shows a calm placeholder while the host is still getting the two clips. */
  loading?: boolean;
  copy?: ClipCompareCopy;
  className?: string;
}

/** Two playing videos further apart than this (seconds) are pulled back together. */
export const CLIP_COMPARE_DRIFT_S = 0.25;
const KEY_STEP_S = 1;
const WIPE_STEP = 2;
const WIPE_BIG_STEP = 10;

const clampPct = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

function playMedia(el: HTMLMediaElement, onBlocked: () => void) {
  if (typeof el.play !== "function") return;
  try { void Promise.resolve(el.play()).catch(onBlocked); } catch { onBlocked(); }
}

/** The shortest length among the videos that report one, or 0 when none does. */
function shortest(els: readonly HTMLVideoElement[]): number {
  const lengths = els.map((el) => el.duration).filter((d) => Number.isFinite(d) && d > 0);
  return lengths.length ? Math.min(...lengths) : 0;
}

export function ClipCompare({ before, after, mode: modeProp, onModeChange, loading = false, copy, className }: ClipCompareProps) {
  const text = { ...defaultCopy(), ...copy };
  const [modeState, setModeState] = useState<ClipCompareMode>("side_by_side");
  const mode = modeProp ?? modeState;
  const wipe = mode === "wipe";
  const [at, setAt] = useState(50);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState({ before: before.kind === "image", after: after.kind === "image" });
  const [ended, setEnded] = useState(false);

  const beforeVideo = useRef<HTMLVideoElement>(null);
  const afterVideo = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);
  const scrubbing = useRef(false);

  const hasVideo = before.kind === "video" || after.kind === "video";
  const videos = useCallback((): HTMLVideoElement[] => {
    const list: HTMLVideoElement[] = [];
    if (before.kind === "video" && beforeVideo.current) list.push(beforeVideo.current);
    if (after.kind === "video" && afterVideo.current) list.push(afterVideo.current);
    return list;
  }, [before.kind, after.kind]);
  /** The first video drives the shared time; the other follows it. */
  const leader = () => videos()[0] ?? null;

  const audioSide: "before" | "after" = wipe && at > 50 ? "before" : "after";

  // A new source starts that side over.
  useEffect(() => {
    setReady({ before: before.kind === "image", after: after.kind === "image" });
    setFailed(false);
    setPlaying(false);
    setEnded(false);
    setTime(0);
  }, [before.src, before.kind, after.src, after.kind]);

  // Videos that already have their metadata when React attaches (a cached clip) are ready now.
  useEffect(() => {
    const els = videos();
    setReady((r) => ({
      before: r.before || before.kind === "image" || (beforeVideo.current?.readyState ?? 0) >= 1,
      after: r.after || after.kind === "image" || (afterVideo.current?.readyState ?? 0) >= 1,
    }));
    setDuration(shortest(els));
  }, [videos, before.kind, after.kind, before.src, after.src]);

  // Sound: muted by default; unmuted, one side only.
  useEffect(() => {
    if (beforeVideo.current) beforeVideo.current.muted = muted || audioSide !== "before";
    if (afterVideo.current) afterVideo.current.muted = muted || audioSide !== "after";
  }, [muted, audioSide, before.src, after.src, failed]);

  const pauseAll = () => { for (const el of videos()) if (!el.paused && typeof el.pause === "function") el.pause(); };
  const seekTo = (sec: number) => {
    const total = duration || shortest(videos());
    const next = Math.min(Math.max(sec, 0), total > 0 ? total : Math.max(sec, 0));
    for (const el of videos()) el.currentTime = next;
    setTime(next);
    setEnded(false);
  };
  const toggle = () => {
    if (playing) {
      pauseAll();
      setPlaying(false);
      return;
    }
    if (ended) seekTo(0);
    setEnded(false);
    setPlaying(true);
    for (const el of videos()) playMedia(el, () => { pauseAll(); setPlaying(false); });
  };

  const onTimeUpdate = (el: HTMLVideoElement) => {
    const lead = leader();
    if (!lead) return;
    if (el === lead) {
      setTime(lead.currentTime);
      for (const other of videos()) if (other !== lead && Math.abs(other.currentTime - lead.currentTime) > CLIP_COMPARE_DRIFT_S) other.currentTime = lead.currentTime;
    } else if (Math.abs(el.currentTime - lead.currentTime) > CLIP_COMPARE_DRIFT_S) {
      el.currentTime = lead.currentTime;
    }
  };
  const onMeta = (side: "before" | "after") => {
    setReady((r) => ({ ...r, [side]: true }));
    setDuration(shortest(videos()));
  };
  const onEnded = () => {
    pauseAll();
    setPlaying(false);
    setEnded(true);
    const total = duration || shortest(videos());
    if (total > 0) setTime(total);
  };

  const setMode = (next: ClipCompareMode) => {
    if (next === mode) return;
    if (modeProp === undefined) setModeState(next);
    onModeChange?.(next);
  };

  // The wipe handle.
  const place = (clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || !(rect.width > 0)) return;
    setAt(clampPct(((clientX - rect.left) / rect.width) * 100));
  };
  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* capture is a nicety */ }
    dragging.current = event.pointerId;
    place(event.clientX);
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => { if (dragging.current === event.pointerId) place(event.clientX); };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current !== event.pointerId) return;
    dragging.current = null;
    try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* already released */ }
  };
  const onWipeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? WIPE_BIG_STEP : WIPE_STEP;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") setAt((v) => clampPct(v - step));
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") setAt((v) => clampPct(v + step));
    else if (event.key === "PageDown") setAt((v) => clampPct(v - WIPE_BIG_STEP));
    else if (event.key === "PageUp") setAt((v) => clampPct(v + WIPE_BIG_STEP));
    else if (event.key === "Home") setAt(0);
    else if (event.key === "End") setAt(100);
    else return;
    event.preventDefault();
  };

  // The scrub bar.
  const seekFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0 || duration <= 0) return;
    const rtl = typeof getComputedStyle === "function" && getComputedStyle(event.currentTarget).direction === "rtl";
    const along = rtl ? box.right - event.clientX : event.clientX - box.left;
    seekTo((along / box.width) * duration);
  };
  const onScrubKey = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = time + KEY_STEP_S;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = time - KEY_STEP_S;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = duration;
    if (next === null) return;
    event.preventDefault();
    seekTo(next);
  };

  if (failed) {
    const AlertIcon = getIcon("alert-triangle");
    return (
      <div data-slot="clip-compare" data-state="error" role="alert" className={cn("flex w-full items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-card)] p-4 text-[var(--foreground)]", className)}>
        <AlertIcon className="mt-0.5 size-5 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
        <p className="text-base">{text.error}</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div data-slot="clip-compare" data-state="loading" role="status" aria-busy="true" aria-label={text.loading} className={cn("flex w-full flex-col gap-3", className)}>
        <Skeleton animation="pulse" className="h-12 w-full rounded-full motion-reduce:animate-none" />
        <Skeleton animation="pulse" className="aspect-video w-full rounded-[var(--radius-card)] motion-reduce:animate-none" />
        <Skeleton animation="pulse" className="h-12 w-full rounded-full motion-reduce:animate-none" />
      </div>
    );
  }

  const PlayIcon = getIcon(playing ? "pause" : "play");
  const SoundIcon = getIcon(muted ? "volume-x" : "volume-2");
  const GripIcon = getIcon("grip-vertical");
  const waiting = !ready.before || !ready.after;
  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  const sides = [
    { key: "before" as const, side: before, ref: beforeVideo, label: before.label ?? text.before },
    { key: "after" as const, side: after, ref: afterVideo, label: after.label ?? text.after },
  ];

  return (
    <div data-slot="clip-compare" data-state={playing ? "playing" : "paused"} data-mode={mode} data-audio={muted ? "muted" : audioSide} aria-busy={waiting || undefined} className={cn("@container/clip-compare flex w-full flex-col gap-3", className)}>
      <ToggleGroup
        type="single"
        variant="segmented"
        fill
        aria-label={text.modeLabel}
        value={mode}
        onValueChange={(value) => { if (value === "side_by_side" || value === "wipe") setMode(value); }}
        className="@[34rem]/clip-compare:w-fit"
      >
        <ToggleGroupItem value="side_by_side">{text.sideBySide}</ToggleGroupItem>
        <ToggleGroupItem value="wipe">{text.wipe}</ToggleGroupItem>
      </ToggleGroup>

      <div
        ref={frame}
        data-slot="clip-compare-frame"
        className={cn(
          wipe
            ? "relative aspect-video w-full cursor-ew-resize touch-none overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-stage)] select-none"
            : "grid grid-cols-1 gap-3 @[34rem]/clip-compare:grid-cols-2",
        )}
        onPointerDown={wipe ? down : undefined}
        onPointerMove={wipe ? move : undefined}
        onPointerUp={wipe ? up : undefined}
        onPointerCancel={wipe ? up : undefined}
      >
        {sides.map(({ key, side, ref, label }) => (
          <div
            key={key}
            data-slot="clip-compare-pane"
            data-side={key}
            className={cn(
              "overflow-hidden bg-[var(--surface-stage)]",
              wipe ? "absolute inset-0" : "relative aspect-video rounded-[var(--radius-card)] border border-[var(--border)]",
            )}
            style={wipe && key === "after" ? { clipPath: `inset(0 0 0 ${at}%)` } : undefined}
          >
            {side.kind === "video" ? (
              // These are the person's own clips; there is no caption track to offer.
              <video
                ref={ref}
                src={side.src}
                poster={side.poster}
                muted
                playsInline
                preload="auto"
                aria-label={label}
                onLoadedMetadata={() => onMeta(key)}
                onLoadedData={() => onMeta(key)}
                onTimeUpdate={(event) => onTimeUpdate(event.currentTarget)}
                onEnded={onEnded}
                onError={() => setFailed(true)}
                className="pointer-events-none absolute inset-0 size-full object-contain"
              />
            ) : (
              <SafeImage src={side.src} alt={label} kind="picture" draggable={false} onError={() => setFailed(true)} className="pointer-events-none absolute inset-0 size-full object-contain" />
            )}
            {side.kind === "video" && !ready[key] ? <Skeleton data-slot="clip-compare-pending" aria-hidden animation="pulse" className="absolute inset-0 rounded-none motion-reduce:animate-none" /> : null}
            <span
              data-slot="clip-compare-label"
              className="pointer-events-none absolute bottom-2 rounded-full bg-[var(--surface-card)]/90 px-3 py-1 text-sm font-medium text-[var(--foreground)]"
              style={wipe && key === "after" ? { insetInlineStart: `calc(${at}% + 0.5rem)` } : { insetInlineStart: "0.5rem" }}
            >
              {label}
            </span>
          </div>
        ))}
        {wipe ? (
          <div
            role="slider"
            tabIndex={0}
            aria-label={text.wipeHandle}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={at}
            aria-valuetext={text.wipeValue(at)}
            data-slot="clip-compare-handle"
            onKeyDown={onWipeKey}
            className="absolute inset-y-0 w-12 -translate-x-1/2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            style={{ left: `${at}%` }}
          >
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-[var(--primary)]" />
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md">
              <GripIcon className="size-5" />
            </span>
          </div>
        ) : null}
      </div>

      {waiting ? <span role="status" className="sr-only">{text.loading}</span> : null}

      {hasVideo ? (
        <div data-slot="clip-compare-transport" className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? text.pause : text.play}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] transition-transform focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
          >
            <PlayIcon className="size-5" aria-hidden />
          </button>
          <span data-slot="clip-compare-time" className="shrink-0 text-sm text-[var(--muted-foreground)] tabular-nums">
            <span className="text-[var(--foreground)]">{formatTime(time)}</span> / {formatTime(duration)}
          </span>
          <div
            role="slider"
            tabIndex={0}
            aria-label={text.position}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
            aria-valuetext={text.positionValue(formatTime(time), formatTime(duration))}
            onKeyDown={onScrubKey}
            onPointerDown={(event) => {
              scrubbing.current = true;
              try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* capture is a nicety */ }
              seekFromPointer(event);
            }}
            onPointerMove={(event) => { if (scrubbing.current) seekFromPointer(event); }}
            onPointerUp={() => { scrubbing.current = false; }}
            onPointerCancel={() => { scrubbing.current = false; }}
            className="relative flex h-12 min-w-0 flex-1 cursor-pointer touch-none items-center rounded-full focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            <div className="relative h-2 w-full rounded-full bg-[var(--muted)]">
              <div data-slot="clip-compare-fill" className="absolute inset-y-0 start-0 rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
              <span aria-hidden className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-[var(--primary)] bg-[var(--background)] shadow-sm" style={{ insetInlineStart: `calc(${pct}% - 0.5rem)` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? text.unmute : text.mute}
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-card)] text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            <SoundIcon className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
