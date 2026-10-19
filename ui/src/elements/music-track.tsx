"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, LibraryIcon, RefreshCwIcon, Share2Icon, SquareIcon, WandSparklesIcon } from "lucide-react";
import { cn } from "cn";
import { Alert, AlertDescription } from "@/kit/ui/alert";
import { Button } from "@/kit/ui/button";
import { Card, CardContent } from "@/kit/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/kit/ui/collapsible";
import { Progress } from "@/kit/ui/progress";
import { Player, type PlayerCopy, type PlayerMetadata } from "@/kit/primitives/Player";
import { GenerationStage } from "./generation-stage";
import { stepVersion, type VersionLike } from "./image-editor-state";
import { barValue, formatClock } from "./video-player";

export type MusicTrackStatus = "queued" | "generating" | "ready" | "failed" | "cancelled";

export interface MusicTrackCopy {
  queued: string;
  generating: string;
  stop: string;
  download: string;
  share: string;
  saveToLibrary: string;
  makeAnother: string;
  retry: string;
  stopped: string;
  failed: string;
  lyrics: string;
  previous: string;
  next: string;
  useVersion: string;
  versionOf: (n: number, total: number) => string;
  queuePosition: (position: number) => string;
  progress: (value: number, elapsed: string | undefined) => string;
  player: Partial<PlayerCopy>;
}

const DEFAULT_COPY: MusicTrackCopy = {
  queued: "Waiting its turn", generating: "Making your song", stop: "Stop",
  download: "Download", share: "Share", saveToLibrary: "Save to Music", makeAnother: "Make another",
  retry: "Try again", stopped: "Stopped. Nothing was kept.", failed: "I couldn't make that song.",
  lyrics: "Lyrics", previous: "Previous", next: "Next", useVersion: "Use this version",
  versionOf: (n, total) => `Version ${n} of ${total}`,
  queuePosition: (position) => `Place in line: ${position}`,
  progress: (value, elapsed) => `${value} percent${elapsed ? `, ${elapsed} so far` : ""}`,
  player: {},
};

function download(src: string, name: string) {
  const link = document.createElement("a");
  link.href = src;
  link.download = name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

/** A generated song. The host owns sources, version selection and all I/O. */
export function MusicTrack({
  status, title, description, src, progress, phaseLabel, queuePosition, startedAt,
  estimateMs = 120_000, etaLabel, hint, error, downloadName = "song.m4a", lyrics, timedLyrics, cover, coverAlt, coverActions,
  versions = [], currentId, onSelectVersion, onUseVersion, onStop, onRetry, onDownload,
  onShare, onSaveToLibrary, onMakeAnother, actions, metadata, copy, className,
  width = "default", editContent, editLabel = "Edit", editPanelLabel,
}: {
  status: MusicTrackStatus;
  title: string;
  description?: string;
  src?: string;
  progress?: number | null;
  phaseLabel?: string;
  queuePosition?: number | null;
  startedAt?: number;
  estimateMs?: number;
  etaLabel?: string;
  hint?: string;
  error?: string;
  downloadName?: string;
  lyrics?: string;
  cover?: string;
  coverAlt?: string;
  coverActions?: ReactNode;
  timedLyrics?: { t: number; line: string; section?: string | null }[];
  /** Oldest first, newest last. Selection is controlled by the host. */
  versions?: Array<VersionLike & { label: string }>;
  currentId?: string;
  onSelectVersion?: (id: string) => void;
  onUseVersion?: (id: string) => void;
  onStop?: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onSaveToLibrary?: () => void;
  onMakeAnother?: () => void;
  actions?: ReactNode;
  metadata?: PlayerMetadata;
  copy?: Partial<MusicTrackCopy>;
  width?: "default" | "full";
  editContent?: ReactNode;
  editLabel?: string;
  editPanelLabel?: string;
  /** Placement in the parent only. */
  className?: string;
}) {
  const text = { ...DEFAULT_COPY, ...copy };
  const [media, setMedia] = useState<HTMLMediaElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const editPanelId = `music-track-edit-${useId()}`;
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    if (!media || !timedLyrics) return;
    const sync = () => setCurrentTime(media.currentTime);
    sync();
    media.addEventListener("timeupdate", sync);
    media.addEventListener("seeked", sync);
    return () => {
      media.removeEventListener("timeupdate", sync);
      media.removeEventListener("seeked", sync);
    };
  }, [media, timedLyrics, src]);
  const activeLine = timedLyrics?.reduce((active, { t }, i) => t <= currentTime ? i : active, -1) ?? -1;
  useEffect(() => {
    if (!lyricsOpen) return;
    lineRefs.current[activeLine]?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activeLine, lyricsOpen, timedLyrics]);
  const live = status === "queued" || status === "generating";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live]);
  const elapsed = startedAt === undefined ? undefined : formatClock(Math.max(0, now - startedAt));
  const value = barValue(progress, startedAt === undefined ? 0 : Math.max(0, now - startedAt), estimateMs);
  const index = versions.findIndex((version) => version.id === currentId);
  const previous = stepVersion(versions, currentId ?? "", -1);
  const next = stepVersion(versions, currentId ?? "", 1);
  const ready = status === "ready";
  const actionButtons = <div className="flex flex-wrap items-center gap-2">
    {src ? <Button type="button" variant="outline" size="sm" onClick={() => onDownload ? onDownload() : download(src, downloadName)}><DownloadIcon aria-hidden />{text.download}</Button> : null}
    {onShare ? <Button type="button" variant="outline" size="sm" onClick={onShare}><Share2Icon aria-hidden />{text.share}</Button> : null}
    {onSaveToLibrary ? <Button type="button" variant="outline" size="sm" onClick={onSaveToLibrary}><LibraryIcon aria-hidden />{text.saveToLibrary}</Button> : null}
    {onMakeAnother ? <Button type="button" variant="outline" size="sm" onClick={onMakeAnother}><WandSparklesIcon aria-hidden />{text.makeAnother}</Button> : null}
    {cover ? coverActions : null}
    {actions}
  </div>;
  const closeEditOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    setEditOpen(false);
    editButtonRef.current?.focus();
  };

  return <Card data-slot="music-track" data-status={status} data-width={width} aria-label={title} className={cn("w-full gap-0 overflow-hidden py-0", width === "full" ? "min-w-0 max-w-none" : "max-w-xl", className)}>
    <CardContent className="flex flex-col gap-3 py-3">
      {ready && src ? <Player kind="audio" layout="audio" audioLayout={width === "full" ? "container" : "viewport"} src={src} title={title} subtitle={description} poster={cover} posterAlt={coverAlt} mediaRef={setMedia} actionsSlot={actionButtons} mediaSession metadata={metadata} copy={text.player} /> : <>
        <div><p className="text-sm font-medium">{title}</p>{description ? <p className="text-muted-foreground text-sm">{description}</p> : null}</div>
        {live ? <>
          <GenerationStage generating={false} aspectRatio="auto" className="rounded-none border-0">
            <div role="status" className="flex flex-col gap-1.5 text-sm">
              <span>{status === "queued" ? text.queued : text.generating}</span>
              {status === "queued" && typeof queuePosition === "number" && queuePosition > 0 ? <span className="text-muted-foreground">{text.queuePosition(queuePosition)}</span> : null}
              {status === "generating" && phaseLabel ? <span>{phaseLabel}</span> : null}
            </div>
          </GenerationStage>
          <Progress value={value} aria-label={text.generating} aria-valuetext={text.progress(value, elapsed)} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs tabular-nums">{[elapsed, typeof progress === "number" ? `${value}%` : undefined, status === "generating" ? etaLabel : undefined].filter(Boolean).join(" · ")}</p>
            {onStop ? <Button type="button" variant="outline" size="sm" onClick={onStop}><SquareIcon aria-hidden />{text.stop}</Button> : null}
          </div>
          {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
        </> : null}
      </>}
      {status === "failed" ? <>
        <Alert variant="destructive"><AlertCircleIcon aria-hidden /><AlertDescription>{error ?? text.failed}</AlertDescription></Alert>
        {onRetry ? <Button type="button" variant="outline" size="sm" onClick={onRetry}><RefreshCwIcon aria-hidden />{text.retry}</Button> : null}
      </> : null}
      {status === "cancelled" ? <p className="text-muted-foreground text-sm">{text.stopped}</p> : null}
      {ready && (timedLyrics || lyrics) ? <Collapsible onOpenChange={setLyricsOpen}>
        <CollapsibleTrigger asChild><Button type="button" variant="outline" size="sm">{text.lyrics}</Button></CollapsibleTrigger>
        <CollapsibleContent>
          {timedLyrics ? <ol className={cn("min-w-0 space-y-1 overflow-x-hidden", width === "full" ? "" : "max-h-64 overflow-y-auto")} aria-label={text.lyrics}>
            {timedLyrics.map(({ t, line, section }, i) => <li key={i} className="min-w-0">
              {section && section !== timedLyrics[i - 1]?.section ? <p className="text-muted-foreground px-3 pt-3 text-xs font-medium">{section}</p> : null}
              <Button
                ref={(node) => { lineRefs.current[i] = node; }}
                type="button" variant="ghost"
                aria-current={i === activeLine ? "true" : undefined}
                className={cn("h-auto w-full min-w-0 justify-start whitespace-pre-wrap px-3 py-2 text-left [overflow-wrap:anywhere]", i === activeLine && "bg-accent text-accent-foreground")}
                onClick={() => {
                  if (!media) return;
                  media.currentTime = t;
                  setCurrentTime(t);
                  void media.play().catch(() => {});
                }}
              >{line}</Button>
            </li>)}
          </ol> : <pre className="whitespace-pre-wrap break-words font-sans text-sm">{lyrics}</pre>}
        </CollapsibleContent>
      </Collapsible> : null}
      {ready && versions.length >= 2 && index >= 0 ? <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="icon" aria-label={text.previous} disabled={!previous || !onSelectVersion} onClick={() => previous && onSelectVersion?.(previous.id)}><ChevronLeftIcon aria-hidden /></Button>
        <span className="text-muted-foreground text-sm" title={versions[index]?.label}>{text.versionOf(index + 1, versions.length)}</span>
        <Button type="button" variant="outline" size="icon" aria-label={text.next} disabled={!next || !onSelectVersion} onClick={() => next && onSelectVersion?.(next.id)}><ChevronRightIcon aria-hidden /></Button>
        {next && onUseVersion && currentId ? <Button type="button" variant="outline" size="sm" onClick={() => onUseVersion(currentId)}>{text.useVersion}</Button> : null}
      </div> : null}
      {editContent !== undefined && editContent !== null ? <Collapsible open={editOpen} onOpenChange={setEditOpen}>
        <CollapsibleTrigger asChild>
          <Button ref={editButtonRef} type="button" variant="outline" size="default" aria-expanded={editOpen} aria-controls={editPanelId}>{editLabel}</Button>
        </CollapsibleTrigger>
        <CollapsibleContent id={editPanelId} role="region" aria-label={editPanelLabel ?? editLabel} onKeyDown={closeEditOnEscape} className="min-w-0 pt-3">
          <div className="flex min-w-0 flex-col gap-3">{editContent}</div>
        </CollapsibleContent>
      </Collapsible> : null}
    </CardContent>
  </Card>;
}
