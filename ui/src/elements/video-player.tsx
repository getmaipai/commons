"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircleIcon,
  DownloadIcon,
  RefreshCwIcon,
  Share2Icon,
  SquareIcon,
  WandSparklesIcon,
} from "lucide-react";
import { cn } from "cn";
import { Alert, AlertDescription } from "@/kit/ui/alert";
import { Button } from "@/kit/ui/button";
import { Card, CardContent } from "@/kit/ui/card";
import { Progress } from "@/kit/ui/progress";
import { GenerationStage } from "./generation-stage";

export type VideoPlayerStatus = "queued" | "generating" | "ready" | "failed" | "cancelled";

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
  error,
  downloadName = "video.mp4",
  loop = true,
  onStop,
  onRetry,
  onDownload,
  onShare,
  onMakeAnother,
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
  /** Failed: the plain reason, ending with what to do. */
  error?: string;
  downloadName?: string;
  loop?: boolean;
  onStop?: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onMakeAnother?: () => void;
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

  return (
    <Card data-slot="video-player" data-status={status} className={cn("w-full max-w-xl gap-0 overflow-hidden py-0", className)}>
      {status === "ready" && src ? (
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
                <Button type="button" variant="outline" size="sm" onClick={onStop}>
                  <SquareIcon aria-hidden />
                  {text.stop}
                </Button>
              ) : null}
            </div>
            {phaseLabel && status === "generating" ? <p className="text-foreground text-sm">{phaseLabel}</p> : null}
            {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
          </>
        ) : null}
        {status === "failed" ? (
          <Alert variant="destructive">
            <AlertCircleIcon aria-hidden />
            <AlertDescription>{error ?? text.failed}</AlertDescription>
          </Alert>
        ) : null}
        {status === "cancelled" ? <p className="text-muted-foreground text-sm">{text.stopped}</p> : null}
        {status === "ready" || status === "failed" || status === "cancelled" ? (
          <div className="flex flex-wrap items-center gap-2">
            {status === "ready" && src ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => (onDownload ? onDownload() : download(src, downloadName))}>
                  <DownloadIcon aria-hidden />
                  {text.download}
                </Button>
                {onShare ? (
                  <Button type="button" variant="ghost" size="sm" onClick={onShare}>
                    <Share2Icon aria-hidden />
                    {text.share}
                  </Button>
                ) : null}
              </>
            ) : null}
            {status === "failed" && onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                <RefreshCwIcon aria-hidden />
                {text.retry}
              </Button>
            ) : null}
            {status !== "failed" && onMakeAnother ? (
              <Button type="button" variant="ghost" size="sm" onClick={onMakeAnother}>
                <WandSparklesIcon aria-hidden />
                {text.makeAnother}
              </Button>
            ) : null}
            {actions}
          </div>
        ) : null}
        {status === "ready" && prompt ? <p className="text-muted-foreground line-clamp-2 text-xs">{prompt}</p> : null}
      </CardContent>
    </Card>
  );
}
