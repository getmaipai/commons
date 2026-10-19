"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { CheckIcon, CircleAlertIcon, CircleSlashIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "cn";
import { ghostButton, mono, paper } from "./surfaces";
import { announced, clamp, pct, progressOf, take } from "./range";
import { Progress } from "@/primitives/Progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/ui/sheet";

export interface JobStage {
  name: string;
  weight: number;
}

export interface JobProgressItem {
  id: string;
  label: string;
  completedBytes: number;
  totalBytes: number;
  state: "queued" | "running" | "paused" | "stalled" | "verifying" | "failed" | "done";
}

export interface JobProgressCopy {
  stalled?: string;
  checksumFailed?: string;
  outOfSpace?: string;
  details?: string;
  resume?: string;
  retry?: string;
}

function formatBytes(bytes: number): string {
  const safe = Math.max(0, bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = safe;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) { value /= 1000; unit += 1; }
  return `${unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

function formatEta(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes < 60 ? `About ${minutes} ${minutes === 1 ? "minute" : "minutes"} left` : `About ${Math.ceil(minutes / 60)} ${Math.ceil(minutes / 60) === 1 ? "hour" : "hours"} left`;
}

export function JobProgress({
  title,
  stages,
  stageIndex,
  stageProgress,
  eta,
  onCancel,
  doneLabel = "done",
  cancelLabel = "Cancel the job",
  outcome,
  elapsedMs,
  completedBytes,
  totalBytes,
  bytesPerSecond,
  etaSeconds,
  items,
  downloadState,
  downloadStatus,
  onResume,
  onRetry,
  copy,
  variant = "full",
  cancelable = true,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "title"
  | "stages"
  | "stageIndex"
  | "stageProgress"
  | "eta"
  | "onCancel"
  | "doneLabel"
  | "cancelLabel"
  | "outcome"
  | "elapsedMs"
  | "completedBytes"
  | "totalBytes"
  | "bytesPerSecond"
  | "etaSeconds"
  | "items"
  | "downloadState"
  | "downloadStatus"
  | "onResume"
  | "onRetry"
  | "copy"
  | "variant"
  | "cancelable"
> & {
  title: string;
  stages: readonly JobStage[];
  stageIndex: number;
  stageProgress: number;
  /** Unset: no time estimate is drawn while the job runs. */
  eta?: string;
  onCancel?: () => void;
  doneLabel?: string;
  cancelLabel?: string;
  outcome?: { status: "success" | "partial" | "failed" | "cancelled"; summary?: string };
  elapsedMs?: number;
  completedBytes?: number;
  totalBytes?: number;
  /** A smoothed transfer rate, in bytes per second. */
  bytesPerSecond?: number;
  /** ETA is withheld until the supplied rate has remained stable over several updates. */
  etaSeconds?: number;
  items?: readonly JobProgressItem[];
  downloadState?: "queued" | "running" | "paused" | "stalled" | "verifying" | "failed" | "done";
  downloadStatus?: string;
  onResume?: () => void;
  onRetry?: () => void;
  copy?: JobProgressCopy;
  variant?: "compact" | "full";
  /** Hide the cancel control when the producer has no cancellation action. */
  cancelable?: boolean;
}) {
  const rates = useRef<number[]>([]);
  const [stableEta, setStableEta] = useState<number | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    if (bytesPerSecond === undefined || bytesPerSecond <= 0 || etaSeconds === undefined || etaSeconds < 0) {
      rates.current = [];
      setStableEta(undefined);
      return;
    }
    rates.current = [...rates.current.slice(-3), bytesPerSecond];
    if (rates.current.length < 4) return;
    const average = rates.current.reduce((sum, rate) => sum + rate, 0) / rates.current.length;
    const spread = (Math.max(...rates.current) - Math.min(...rates.current)) / average;
    if (spread <= 0.2) setStableEta(etaSeconds);
  }, [bytesPerSecond, etaSeconds]);
  const stage = progressOf(stageIndex, stages.length);
  const progress = clamp(stageProgress, 0, 1);
  const totalWeight = stages.reduce((sum, item) => sum + item.weight, 0) || 1;
  const completed = take(stages, stage).reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  const current = stages[stage];
  const overall = pct(
    completed + (current ? current.weight * progress : 0),
    totalWeight,
  );
  const finished = stage >= stages.length || outcome !== undefined;
  const outcomeLabel = outcome?.status === "success" ? doneLabel : outcome?.status;
  const elapsedLabel = elapsedMs === undefined ? undefined : `${Math.max(0, Math.round(elapsedMs / 1000))}s`;

  return (
    <div
      data-slot="job-progress"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        variant === "compact" && "gap-2 p-3",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        {outcome?.status === "partial" ? (
          <CircleAlertIcon className="size-3.5 shrink-0 text-status-warning" />
        ) : outcome?.status === "failed" ? (
          <XIcon className="size-3.5 shrink-0 text-destructive" />
        ) : outcome?.status === "cancelled" ? (
          <CircleSlashIcon className="text-muted-foreground size-3.5 shrink-0" />
        ) : finished ? (
          <CheckIcon className="size-3.5 shrink-0 text-status-ok" />
        ) : (
          <Loader2Icon className="text-foreground/35 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
          {title}
        </span>
        {(finished || eta !== undefined) && (
          <span
            className={cn(mono, "text-muted-foreground shrink-0 tabular-nums")}
          >
            {finished ? outcomeLabel ?? doneLabel : eta}
          </span>
        )}
        {!finished && cancelable && (
          <button
            type="button"
            aria-label={cancelLabel}
            onClick={onCancel}
            className={cn(ghostButton, "size-6 shrink-0")}
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      {finished && elapsedLabel && <time className={cn(mono, "text-muted-foreground")} dateTime={`PT${Math.max(0, Math.round(elapsedMs! / 1000))}S`}>{elapsedLabel}</time>}
      {outcome?.summary && <p className="text-muted-foreground text-xs">{outcome.summary}</p>}

      {completedBytes !== undefined && totalBytes !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span className={cn(mono, "text-muted-foreground tabular-nums")}>{formatBytes(completedBytes)} of {formatBytes(totalBytes)}</span>
          {bytesPerSecond !== undefined && bytesPerSecond > 0 && <span className={cn(mono, "text-muted-foreground tabular-nums")}>{formatBytes(bytesPerSecond)}/s</span>}
          {stableEta !== undefined && !finished && <span className="text-muted-foreground">{formatEta(stableEta)}</span>}
        </div>
      )}

      {(downloadState === "paused" || downloadState === "stalled") && onResume && (
        <button type="button" className={ghostButton} onClick={onResume}>{copy?.resume ?? "Resume"}</button>
      )}
      {downloadState === "failed" && onRetry && (
        <button type="button" className={ghostButton} onClick={onRetry}>{copy?.retry ?? "Retry"}</button>
      )}
      {downloadState === "stalled" && <p className="text-muted-foreground text-xs">{copy?.stalled ?? "Download paused after the connection stalled."}</p>}
      {downloadState === "failed" && copy?.checksumFailed && downloadStatus?.toLowerCase().includes("checksum") && <p className="text-muted-foreground text-xs">{copy.checksumFailed}</p>}
      {downloadState === "failed" && copy?.outOfSpace && downloadStatus?.toLowerCase().includes("space") && <p className="text-muted-foreground text-xs">{copy.outOfSpace}</p>}

      <div className="flex items-center gap-2">
        <Progress mode="determinate" value={completedBytes !== undefined && totalBytes ? completedBytes / totalBytes * 100 : overall} label={`${title} progress`} />
        {completedBytes !== undefined && totalBytes !== undefined && <span className={cn(mono, "text-muted-foreground shrink-0 tabular-nums")}>{announced(completedBytes / Math.max(1, totalBytes) * 100)}%</span>}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {stages.map((item, i) => (
          <span
            key={item.name}
            className={cn(
              mono,
              i < stage
                ? "text-muted-foreground"
                : i === stage
                  ? "text-foreground/90"
                  : "text-muted-foreground",
            )}
          >
            {item.name}
          </span>
        ))}
      </div>
      {items && items.length > 0 && (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetTrigger asChild><button type="button" className={ghostButton}>{copy?.details ?? "File details"}</button></SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{copy?.details ?? "Download file progress"}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-4">
              {items.map((item) => <div key={item.id} className="flex flex-col gap-1">
                <div className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate">{item.label}</span><span className="text-muted-foreground shrink-0">{item.state}</span></div>
                <Progress mode="determinate" value={item.totalBytes ? item.completedBytes / item.totalBytes * 100 : item.state === "done" ? 100 : 0} label={`${item.label} progress`} />
                <span className={cn(mono, "text-muted-foreground text-xs")}>{formatBytes(item.completedBytes)} of {formatBytes(item.totalBytes)}</span>
              </div>)}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
