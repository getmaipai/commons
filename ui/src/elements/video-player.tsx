"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertCircleIcon,
  DownloadIcon,
  PlayIcon,
  ImagePlusIcon,
  PencilLineIcon,
  RefreshCwIcon,
  Share2Icon,
  SparklesIcon,
  SquareIcon,
  StarIcon,
  WandSparklesIcon,
} from "lucide-react";
import { cn } from "cn";
import { Alert, AlertDescription } from "@/kit/ui/alert";
import { Button } from "@/kit/ui/button";
import { LIKE_POP_CLASS, likeHaptic, useLikePop } from "@/kit/primitives/likeFeedback";
import { Card, CardContent } from "@/kit/ui/card";
import { Progress } from "@/kit/ui/progress";
import { SafeImage } from "@/kit/primitives/SafeImage";
import type { PlayerTextTrack } from "@/kit/primitives/Player";
import { GenerationStage } from "./generation-stage";
import { LockTile } from "./adult-lock";
import { PendingActions, type PendingAction } from "./pending-actions";
import {
  ActionRow,
  VIDEO_PLAYER_ACTION_CAP,
  iconFor,
  type RowAction,
  type VideoPlayerAction,
  type VideoPlayerStarts,
} from "./video-player-actions";

export type {
  VideoPlayerAction,
  VideoPlayerActionWhen,
  VideoPlayerStarts,
} from "./video-player-actions";
import { i18n } from "@/kit/i18n";
export type { PlayerTextTrack } from "@/kit/primitives/Player";
export { VIDEO_PLAYER_ACTION_CAP } from "./video-player-actions";

/** `draft` is the still waiting for the person (Make the video from this, Another still, Edit words); the rest are the job's states. */
export type VideoPlayerStatus = "draft" | "queued" | "generating" | "ready" | "failed" | "cancelled";

/** The built-in controls, for `controls`. */
export type VideoPlayerControlName = "stop" | "retry" | "makeAnother" | "render" | "anotherStill" | "editWords" | "favorite";

/** Per built-in control: `disabledReason` (one plain line; present means disabled) and `starts` (what it starts, for the host's marker). */
export interface VideoPlayerControl {
  disabledReason?: string;
  starts?: VideoPlayerStarts;
}

/** The width an entry may take. `default` is about 576 px, `lg` 768, `xl` 1024, `full` the whole column. */
export type VideoPlayerSize = "default" | "lg" | "xl" | "full";

const SIZE_CLASS: Record<VideoPlayerSize, string> = {
  default: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-none",
};

/** What each built-in starts when the host says nothing: Retry, Make another and Render start a clip, Another still a picture. */
const DEFAULT_STARTS: Partial<Record<VideoPlayerControlName, VideoPlayerStarts>> = {
  retry: "video",
  makeAnother: "video",
  render: "video",
  anotherStill: "picture",
};

export interface VideoPlayerCopy {
  queued?: string;
  generating?: string;
  stop?: string;
  download?: string;
  share?: string;
  makeAnother?: string;
  retry?: string;
  stopped?: string;
  failed?: string;
  render?: string;
  anotherStill?: string;
  editWords?: string;
  cancel?: string;
  favorite?: string;
  more?: string;
  play?: string;
}

const defaultCopy = (): Required<VideoPlayerCopy> => ({
  queued: i18n._({ id: "ui.Waiting its turn", message: "Waiting its turn" }),
  generating: i18n._({ id: "ui.Making your video", message: "Making your video" }),
  stop: i18n._({ id: "ui.Stop", message: "Stop" }),
  download: i18n._({ id: "ui.Download", message: "Download" }),
  share: i18n._({ id: "ui.Share", message: "Share" }),
  makeAnother: i18n._({ id: "ui.Make another", message: "Make another" }),
  retry: i18n._({ id: "ui.Try again", message: "Try again" }),
  stopped: i18n._({ id: "ui.Stopped. Nothing was kept.", message: "Stopped. Nothing was kept." }),
  failed: i18n._({ id: "ui.I couldn't make that video.", message: "I couldn't make that video." }),
  render: i18n._({ id: "ui.Make the video from this", message: "Make the video from this" }),
  anotherStill: i18n._({ id: "ui.Another still", message: "Another still" }),
  editWords: i18n._({ id: "ui.Edit words", message: "Edit words" }),
  cancel: i18n._({ id: "ui.Cancel", message: "Cancel" }),
  favorite: i18n._({ id: "ui.Favorite", message: "Favorite" }),
  more: i18n._({ id: "ui.More", message: "More" }),
  play: i18n._({ id: "ui.Play", message: "Play" }),
});

/** m:ss for a count of milliseconds. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** The share of the bar to draw. A reported progress wins; with none, a slow estimate from elapsed time that never passes 90. */
export function barValue(progress: number | null | undefined, elapsedMs: number, estimateMs: number): number {
  if (typeof progress === "number" && Number.isFinite(progress)) return Math.max(0, Math.min(100, Math.round(progress)));
  if (estimateMs <= 0) return 0;
  return Math.min(90, Math.round((elapsedMs / estimateMs) * 90));
}

function download(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

/**
 * A generated clip in a chat or a gallery: the progress card while it is being made (elapsed time, a bar, Stop),
 * then the clip in the browser's own player with poster, controls and loop, a caption from the prompt, and
 * Download, Share, Make another and any extra action the host passes. No network access inside the Element:
 * every source, handler and string is a prop.
 *
 * Additive (VIDEO-UI-02, every default unchanged): a `draft` status (the still plus onRender, onAnotherStill,
 * onEditWords), `actionItems` (per-action `when`, `disabledReason`, `starts`), `actionsVariant="icons"`,
 * `actionsInline` with a More menu, a Favorite toggle, `notice` (visible in every status; `hint` stays live-only),
 * `controls` (`disabledReason` and `starts` for the built-ins), `size`, and optional WebVTT `tracks`.
 */
/** The props of an unlocked player (the whole Element API). */
export type VideoPlayerProps = Parameters<typeof VideoPlayerBody>[0];

/** ADULT-LOCK-01: the locked state of the player. It renders the one lock tile at the entry's width and loads nothing: no `video`
 * element, no source, no poster, no prompt, no actions. */
export type VideoPlayerLockedProps = { locked: true; making?: boolean; size?: VideoPlayerSize; onUnlock?: () => void };

function VideoPlayerBody({
  status,
  prompt,
  src,
  poster,
  width = 832,
  height = 480,
  progress,
  phaseLabel,
  queuePosition,
  startedAt,
  estimateMs = 120_000,
  previewSrc,
  etaLabel,
  hint,
  notice,
  still,
  size = "default",
  pendingActions,
  error,
  downloadName = "video.mp4",
  loop = true,
  onStop,
  onRetry,
  onDownload,
  onShare,
  onMakeAnother,
  onRender,
  onAnotherStill,
  onEditWords,
  favorite = false,
  onFavorite,
  controls,
  actionItems,
  actionsVariant = "labelled",
  actionsInline,
  actionsReveal = "always",
  chrome = "default",
  caption = true,
  tracks,
  badges,
  actions,
  copy,
  className,
}: {
  status: VideoPlayerStatus;
  /** What the person asked for: the caption and the player's accessible name. */
  prompt: string;
  src?: string;
  poster?: string;
  width?: number;
  height?: number;
  /** 0 to 100 as the engine reports it; leave out when it does not. */
  progress?: number | null;
  /** The engine's current step in the person's words ("Drawing the frames"). */
  phaseLabel?: string;
  /** Place in line when the engine is busy. */
  queuePosition?: number | null;
  /** Epoch milliseconds the job started; the Element ticks the elapsed clock itself. */
  startedAt?: number;
  /** How long a clip usually takes, for the bar when the engine reports no progress. */
  estimateMs?: number;
  /** While generating: a frame of the clip so far (the engine's first-frame preview). It cross-fades in over the shimmer, and the finished clip's poster takes over. */
  previewSrc?: string;
  /** While generating: how long is left ("about 1 minute left"), after the clock and the percent. */
  etaLabel?: string;
  /** One quiet line under the bar ("Videos are 5 seconds at 480p and take about 2 minutes"). */
  hint?: string;
  /** Visible text in every status (draft, ready, failed, cancelled and live), for a line the person must see, such as why Make is disabled. `hint` is unchanged: live only. */
  notice?: string;
  /** Draft: the still the person is looking at. Falls back to `poster`. */
  still?: string;
  /** How wide the entry may be. Default about 576 px. */
  size?: VideoPlayerSize;
  /** Answers to a held job ("Make it now at the lower level"). Drawn only while the status is queued. */
  pendingActions?: PendingAction[];
  /** Failed: the plain reason, ending with what to do. */
  error?: string;
  downloadName?: string;
  loop?: boolean;
  onStop?: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onMakeAnother?: () => void;
  /** Draft: make the video from this still. */
  onRender?: () => void;
  /** Draft: make a different still from the same words. */
  onAnotherStill?: () => void;
  /** Draft: go back to the words. */
  onEditWords?: () => void;
  /** Whether this clip is a favorite; drives the Favorite toggle's pressed state. */
  favorite?: boolean;
  /** Draws the Favorite toggle (ready and draft) at the end of the row; called with the new state. */
  onFavorite?: (next: boolean) => void;
  /** `disabledReason` and `starts` per built-in control (stop, retry, makeAnother, render, anotherStill, editWords, favorite). */
  controls?: Partial<Record<VideoPlayerControlName, VideoPlayerControl>>;
  /** Structured row actions: per-action `when` (default `["ready"]`), `disabledReason` and `starts`. At most VIDEO_PLAYER_ACTION_CAP are drawn. */
  actionItems?: VideoPlayerAction[];
  /** `icons`: icon buttons, the label is the accessible name and tooltip. Default labelled buttons. */
  actionsVariant?: "labelled" | "icons";
  /** How many row actions draw as buttons; the rest sit behind a More menu. Default all (up to the cap). */
  actionsInline?: number;
  /** VIDEO-UI-14: `hover` shows the icon row of a `ready` or `draft` clip on pointer hover and on keyboard focus anywhere in the player,
   * and always on a touch device (no hover). Only that row hides: the `notice`, progress, Stop, the failed reason and Try again stay
   * visible in every status. Default `always`. */
  actionsReveal?: "always" | "hover";
  /** VIDEO-UI-14: `overlay` draws Favorite, a Play button and the icon row over a `ready` or `draft` picture on `--art-overlay` and
   * `--art-foreground`, instead of in a row under it. Other statuses keep their row under the picture. Default `default`. */
  chrome?: "default" | "overlay";
  /** VIDEO-UI-14: false leaves out the prompt caption under the clip (the host prints the words once itself). The prompt is still the
   * clip's accessible name. Default true. */
  caption?: boolean;
  tracks?: readonly PlayerTextTrack[];
  /** VIDEO-UI-14: short strings drawn on the picture's top edge, in every status. */
  badges?: string[];
  /** Extra buttons after the standard ones (for example "Animate"). */
  actions?: ReactNode;
  copy?: VideoPlayerCopy;
  className?: string;
}) {
  const text = { ...defaultCopy(), ...copy };
  const live = status === "queued" || status === "generating";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live]);
  const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
  const ratio = width > 0 && height > 0 ? `${width} / ${height}` : "832 / 480";
  const value = barValue(progress, elapsedMs, estimateMs);
  const icons = actionsVariant === "icons";
  // VIDEO-UI-14: the overlay chrome and the hover reveal reach only a clip with a picture (`ready` with a source, or `draft`).
  const hasPicture = status === "draft" || (status === "ready" && Boolean(src));
  const overlay = chrome === "overlay" && hasPicture;
  const reveal = actionsReveal === "hover" && (status === "ready" || status === "draft");
  const tags = (badges ?? []).filter(Boolean);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const control = (name: VideoPlayerControlName) => ({ disabledReason: controls?.[name]?.disabledReason, starts: controls?.[name]?.starts ?? DEFAULT_STARTS[name] });

  // The row: items placed at the start, the built-ins for this status, then items placed at the end.
  const builtIns: RowAction[] = [];
  if (status === "draft") {
    if (onRender) builtIns.push({ key: "render", label: text.render, icon: <SparklesIcon aria-hidden />, onSelect: onRender, variant: "default", alwaysLabelled: true, ...control("render") });
    if (onAnotherStill) builtIns.push({ key: "another-still", label: text.anotherStill, icon: <ImagePlusIcon aria-hidden />, onSelect: onAnotherStill, ...control("anotherStill") });
    if (onEditWords) builtIns.push({ key: "edit-words", label: text.editWords, icon: <PencilLineIcon aria-hidden />, onSelect: onEditWords, ...control("editWords") });
    if (onStop) builtIns.push({ key: "cancel", label: text.cancel, icon: <SquareIcon aria-hidden />, onSelect: onStop, ...control("stop") });
  }
  if (status === "ready" && src) {
    builtIns.push({ key: "download", label: text.download, icon: <DownloadIcon aria-hidden />, onSelect: () => (onDownload ? onDownload() : download(src, downloadName)) });
    if (onShare) builtIns.push({ key: "share", label: text.share, icon: <Share2Icon aria-hidden />, onSelect: onShare });
  }
  if (status === "failed" && onRetry) builtIns.push({ key: "retry", label: text.retry, icon: <RefreshCwIcon aria-hidden />, onSelect: onRetry, variant: "outline", ...control("retry") });
  if (status !== "failed" && status !== "draft" && onMakeAnother) builtIns.push({ key: "make-another", label: text.makeAnother, icon: <WandSparklesIcon aria-hidden />, onSelect: onMakeAnother, ...control("makeAnother") });
  const items: Array<RowAction & { placement: "start" | "end" }> = (actionItems ?? [])
    .filter(item => (item.when ?? ["ready"]).includes(status))
    .slice(0, VIDEO_PLAYER_ACTION_CAP)
    .map((item, index) => ({
      key: item.key ?? `item-${index}-${item.label}`,
      label: item.label,
      icon: iconFor(item.icon),
      disabledReason: item.disabledReason,
      starts: item.starts,
      placement: item.placement ?? "end",
      onSelect: () => item.onSelect?.(),
    }));
  const rowActions: RowAction[] = [...items.filter(item => item.placement === "start"), ...builtIns, ...items.filter(item => item.placement === "end")];
  const favoriteControl = control("favorite");
  const favoriteButton = onFavorite && (status === "ready" || status === "draft") ? (
    <FavoriteToggle label={text.favorite} pressed={favorite} icons={icons} disabledReason={favoriteControl.disabledReason} onToggle={() => onFavorite(!favorite)} />
  ) : null;

  const picture = (
      status === "draft" ? (
        <div data-slot="video-player-still" className="bg-muted relative block w-full overflow-hidden" style={{ aspectRatio: ratio }}>
          <SafeImage src={still ?? poster} alt={prompt} kind="video" className="size-full object-cover" />
        </div>
      ) : status === "ready" && src ? (
        // Generated clips carry no audio track, so there is nothing to caption; the prompt is the caption below.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          data-slot="video-player-media"
          ref={videoRef}
          className="bg-muted block w-full"
          style={{ aspectRatio: ratio }}
          src={src}
          poster={poster}
          controls={overlay ? playing : true}
          {...(overlay ? { onPlay: () => setPlaying(true), onPause: () => setPlaying(false), onEnded: () => setPlaying(false) } : {})}
          loop={loop}
          playsInline
          preload="metadata"
          aria-label={prompt}
        >
          {tracks?.map((track, index) => <track key={`${track.srclang}-${index}`} src={track.src} kind={track.kind ?? "subtitles"} label={track.label} srcLang={track.srclang} default={track.default} />)}
        </video>
      ) : (
        <GenerationStage generating={live} previewSrc={status === "generating" ? previewSrc : undefined} aspectRatio={ratio} className="rounded-none border-0">
          {live ? (
            <div data-slot="video-player-stage" role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center text-sm">
              {status === "queued" ? <span className="text-muted-foreground">{text.queued}</span> : null}
              {status === "queued" && typeof queuePosition === "number" && queuePosition > 0 ? <span className="text-muted-foreground">{i18n._({ id: "ui.Place in line: {position}", message: "Place in line: {position}", values: { position: queuePosition } })}</span> : null}
              {status === "generating" ? <span className="sr-only">{text.generating}</span> : null}
              {status === "generating" && phaseLabel ? <span className="sr-only">{phaseLabel}</span> : null}
              {status === "generating" && !previewSrc ? <span className="text-muted-foreground line-clamp-3 max-w-md text-balance">{prompt}</span> : null}
            </div>
          ) : null}
        </GenerationStage>
      )
  );

  const REVEAL = "motion-safe:transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/player:opacity-100 group-focus-within/player:opacity-100";
  const rowHasContent = rowActions.length > 0 || Boolean(actions);
  const framed = overlay || tags.length > 0 ? (
    <div data-slot="video-player-picture" className="relative">
      {picture}
      {tags.length > 0 ? (
        <ul data-slot="video-player-badges" aria-label={i18n._({ id: "ui.Details", message: "Details" })} className={cn("pointer-events-none absolute start-3 top-3 m-0 flex list-none flex-wrap gap-1.5 p-0", overlay && favoriteButton ? "end-14" : "end-3")}>
          {tags.map((tag, i) => (
            <li key={`${i}-${tag}`} className="rounded-full bg-[var(--art-overlay)] px-2.5 py-0.5 text-xs font-medium text-[var(--art-foreground)] backdrop-blur-sm">{tag}</li>
          ))}
        </ul>
      ) : null}
      {overlay && favoriteButton ? (
        <div data-slot="video-player-overlay-favorite" className="absolute end-3 top-3 rounded-full bg-[var(--art-overlay)] text-[var(--art-foreground)] backdrop-blur-sm">{favoriteButton}</div>
      ) : null}
      {overlay && status === "ready" && !playing ? (
        <button
          type="button"
          data-slot="video-player-play"
          aria-label={text.play}
          onClick={() => { try { void videoRef.current?.play?.()?.catch?.(() => {}); } catch { /* the native controls remain */ } }}
          className="absolute start-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-[var(--art-overlay)] text-[var(--art-foreground)] backdrop-blur-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <PlayIcon aria-hidden className="size-5 fill-current" />
        </button>
      ) : null}
      {overlay && rowHasContent ? (
        <div
          data-slot="video-player-overlay-actions"
          className={cn(
            "absolute end-3 rounded-2xl bg-[var(--art-overlay)] px-1 py-0.5 text-[var(--art-foreground)] backdrop-blur-sm",
            // A draft has no Play button and a wide main action, so its row takes the picture's full width; a clip leaves room for Play.
            status === "draft" ? "start-3" : "max-w-[calc(100%-4.5rem)]",
            playing ? "bottom-14" : "bottom-3",
            reveal && REVEAL,
          )}
        >
          <ActionRow actions={rowActions} icons={icons} inline={actionsInline} moreLabel={text.more} slot={actions} className="justify-end" />
        </div>
      ) : null}
    </div>
  ) : picture;

  return (
    <Card data-slot="video-player" data-status={status} className={cn("w-full gap-0 overflow-hidden py-0", (reveal || overlay) && "group/player", SIZE_CLASS[size], className)}>
      {framed}
      {overlay && !notice && !(caption && prompt) ? null : <CardContent className="flex flex-col gap-3 py-3">
        {live ? (
          <>
            <Progress value={value} aria-label={text.generating} aria-valuetext={startedAt ? i18n._({ id: "ui.{value} percent, {time} so far", message: "{value} percent, {time} so far", values: { value, time: formatClock(elapsedMs) } }) : i18n._({ id: "ui.{value} percent", message: "{value} percent", values: { value } })} />
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs tabular-nums">
                {[startedAt ? formatClock(elapsedMs) : "", typeof progress === "number" ? `${value}%` : "", status === "generating" ? etaLabel ?? "" : ""].filter(Boolean).join(" · ")}
              </p>
              {onStop ? (
                <Button type="button" variant="outline" size="sm" disabled={Boolean(controls?.stop?.disabledReason)} onClick={onStop}>
                  <SquareIcon aria-hidden />
                  {text.stop}
                </Button>
              ) : null}
            </div>
            {phaseLabel && (status === "generating" || (status === "queued" && pendingActions && pendingActions.length > 0)) ? <p className="text-foreground text-sm">{phaseLabel}</p> : null}
            {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
            {status === "queued" ? <PendingActions actions={pendingActions} /> : null}
          </>
        ) : null}
        {status === "failed" ? (
          <Alert variant="destructive">
            <AlertCircleIcon aria-hidden />
            <AlertDescription>{error ?? text.failed}</AlertDescription>
          </Alert>
        ) : null}
        {status === "cancelled" ? <p className="text-muted-foreground text-sm">{text.stopped}</p> : null}
        {notice ? <p data-slot="video-player-notice" className="text-muted-foreground text-xs">{notice}</p> : null}
        {!overlay && (status === "draft" || status === "ready" || status === "failed" || status === "cancelled") ? (
          <ActionRow actions={rowActions} icons={icons} inline={actionsInline} moreLabel={text.more} slot={actions} trailing={favoriteButton} className={reveal ? REVEAL : undefined} />
        ) : null}
        {(status === "ready" || status === "draft") && prompt && caption ? <p className="text-muted-foreground line-clamp-2 text-xs">{prompt}</p> : null}
      </CardContent>}
    </Card>
  );
}

function FavoriteToggle({ label, pressed, icons, disabledReason, onToggle }: { label: string; pressed: boolean; icons: boolean; disabledReason?: string; onToggle: () => void }) {
  const pops = useLikePop(pressed);
  return (
    <Button
      type="button"
      variant="ghost"
      size={icons ? "icon-sm" : "sm"}
      aria-pressed={pressed}
      aria-label={icons ? label : undefined}
      title={disabledReason ?? (icons ? label : undefined)}
      disabled={Boolean(disabledReason)}
      data-slot="video-player-favorite"
      onClick={() => { if (!pressed) likeHaptic(); onToggle(); }}
    >
      <StarIcon key={pops} aria-hidden className={cn(pressed && "fill-current", pressed && pops > 0 && LIKE_POP_CLASS)} />
      {icons ? null : label}
    </Button>
  );
}

/** The kit VideoPlayer: the generated clip (see `VideoPlayerBody` above for the whole API) or, with `locked`, the lock tile and nothing else. */
export function VideoPlayer(props: VideoPlayerProps | VideoPlayerLockedProps) {
  if ("locked" in props && props.locked === true) {
    return (
      <div data-slot="video-player" data-locked="true" className={cn("w-full", SIZE_CLASS[props.size ?? "default"])}>
        <LockTile shape="card" making={props.making} onUnlock={props.onUnlock} />
      </div>
    );
  }
  return <VideoPlayerBody {...(props as VideoPlayerProps)} />;
}
