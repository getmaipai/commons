"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircleIcon,
  DownloadIcon,
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
import { Card, CardContent } from "@/kit/ui/card";
import { Progress } from "@/kit/ui/progress";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { GenerationStage } from "./generation-stage";
import { PendingActions, type PendingAction } from "./pending-actions";
import {
  ActionRow,
  ActionSheet,
  VIDEO_PLAYER_ACTION_CAP,
  iconFor,
  type RowAction,
  type VideoPlayerAction,
  type VideoPlayerStarts,
} from "./video-player-actions";

export type {
  VideoPlayerAction,
  VideoPlayerActionWhen,
  VideoPlayerSheet,
  VideoPlayerSheetField,
  VideoPlayerSheetValues,
  VideoPlayerStarts,
} from "./video-player-actions";
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
}

const DEFAULT_COPY: Required<VideoPlayerCopy> = {
  queued: "Waiting its turn",
  generating: "Making your video",
  stop: "Stop",
  download: "Download",
  share: "Share",
  makeAnother: "Make another",
  retry: "Try again",
  stopped: "Stopped. Nothing was kept.",
  failed: "I couldn't make that video.",
  render: "Make the video from this",
  anotherStill: "Another still",
  editWords: "Edit words",
  cancel: "Cancel",
  favorite: "Favorite",
  more: "More",
};

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
 * onEditWords), `actionItems` (per-action `when`, `disabledReason`, `starts`, `sheet`), `actionsVariant="icons"`,
 * `actionsInline` with a More menu, a Favorite toggle, `notice` (visible in every status; `hint` stays live-only),
 * `controls` (`disabledReason` and `starts` for the built-ins) and `size`.
 */
export function VideoPlayer({
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
  /** Structured row actions: per-action `when` (default `["ready"]`), `disabledReason`, `starts`, and a `sheet` form. At most VIDEO_PLAYER_ACTION_CAP are drawn. */
  actionItems?: VideoPlayerAction[];
  /** `icons`: icon buttons, the label is the accessible name and tooltip. Default labelled buttons. */
  actionsVariant?: "labelled" | "icons";
  /** How many row actions draw as buttons; the rest sit behind a More menu. Default all (up to the cap). */
  actionsInline?: number;
  /** Extra buttons after the standard ones (for example "Animate"). */
  actions?: ReactNode;
  copy?: VideoPlayerCopy;
  className?: string;
}) {
  const text = { ...DEFAULT_COPY, ...copy };
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
  const [sheetAction, setSheetAction] = useState<VideoPlayerAction | null>(null);
  const icons = actionsVariant === "icons";
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
      onSelect: () => (item.sheet ? setSheetAction(item) : item.onSelect?.()),
    }));
  const rowActions: RowAction[] = [...items.filter(item => item.placement === "start"), ...builtIns, ...items.filter(item => item.placement === "end")];
  const favoriteControl = control("favorite");
  const favoriteButton = onFavorite && (status === "ready" || status === "draft") ? (
    <FavoriteToggle label={text.favorite} pressed={favorite} icons={icons} disabledReason={favoriteControl.disabledReason} onToggle={() => onFavorite(!favorite)} />
  ) : null;

  return (
    <Card data-slot="video-player" data-status={status} className={cn("w-full gap-0 overflow-hidden py-0", SIZE_CLASS[size], className)}>
      {status === "draft" ? (
        <div data-slot="video-player-still" className="bg-muted relative block w-full overflow-hidden" style={{ aspectRatio: ratio }}>
          <SafeImage src={still ?? poster} alt={prompt} kind="video" className="size-full object-cover" />
        </div>
      ) : status === "ready" && src ? (
        // Generated clips carry no audio track, so there is nothing to caption; the prompt is the caption below.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          data-slot="video-player-media"
          className="bg-muted block w-full"
          style={{ aspectRatio: ratio }}
          src={src}
          poster={poster}
          controls
          loop={loop}
          playsInline
          preload="metadata"
          aria-label={prompt}
        />
      ) : (
        <GenerationStage generating={live} previewSrc={status === "generating" ? previewSrc : undefined} aspectRatio={ratio} className="rounded-none border-0">
          {live ? (
            <div data-slot="video-player-stage" role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center text-sm">
              {status === "queued" ? <span className="text-muted-foreground">{text.queued}</span> : null}
              {status === "queued" && typeof queuePosition === "number" && queuePosition > 0 ? <span className="text-muted-foreground">{`Place in line: ${queuePosition}`}</span> : null}
              {status === "generating" ? <span className="sr-only">{text.generating}</span> : null}
              {status === "generating" && phaseLabel ? <span className="sr-only">{phaseLabel}</span> : null}
              {status === "generating" && !previewSrc ? <span className="text-muted-foreground line-clamp-3 max-w-md text-balance">{prompt}</span> : null}
            </div>
          ) : null}
        </GenerationStage>
      )}
      <CardContent className="flex flex-col gap-3 py-3">
        {live ? (
          <>
            <Progress value={value} aria-label={text.generating} aria-valuetext={startedAt ? `${value} percent, ${formatClock(elapsedMs)} so far` : `${value} percent`} />
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
        {status === "draft" || status === "ready" || status === "failed" || status === "cancelled" ? (
          <ActionRow actions={rowActions} icons={icons} inline={actionsInline} moreLabel={text.more} slot={actions} trailing={favoriteButton} />
        ) : null}
        {(status === "ready" || status === "draft") && prompt ? <p className="text-muted-foreground line-clamp-2 text-xs">{prompt}</p> : null}
      </CardContent>
      {sheetAction?.sheet ? (
        <ActionSheet
          sheet={sheetAction.sheet}
          onClose={() => setSheetAction(null)}
          onSubmit={values => {
            const done = sheetAction.onSubmit;
            setSheetAction(null);
            done?.(values);
          }}
        />
      ) : null}
    </Card>
  );
}

function FavoriteToggle({ label, pressed, icons, disabledReason, onToggle }: { label: string; pressed: boolean; icons: boolean; disabledReason?: string; onToggle: () => void }) {
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
      onClick={onToggle}
    >
      <StarIcon aria-hidden className={pressed ? "fill-current" : undefined} />
      {icons ? null : label}
    </Button>
  );
}
