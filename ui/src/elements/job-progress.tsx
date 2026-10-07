"use client";

import type { ComponentProps } from "react";
import { CheckIcon, CircleAlertIcon, CircleSlashIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "cn";
import { ghostButton, mono, paper } from "./surfaces";
import { announced, clamp, pct, progressOf, take } from "./range";

export interface JobStage {
  name: string;
  weight: number;
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
}) {
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
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        {outcome?.status === "partial" ? (
          <CircleAlertIcon className="size-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
        ) : outcome?.status === "failed" ? (
          <XIcon className="size-3.5 shrink-0 text-red-600 dark:text-red-400" />
        ) : outcome?.status === "cancelled" ? (
          <CircleSlashIcon className="text-muted-foreground size-3.5 shrink-0" />
        ) : finished ? (
          <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
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
        {!finished && (
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

      <span
        role="progressbar"
        aria-label={`${title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={announced(overall)}
        className="bg-foreground/[0.06] h-1 w-full overflow-hidden rounded-full"
      >
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
            outcome?.status === "partial" ? "bg-amber-500 dark:bg-amber-400" : outcome?.status === "failed" ? "bg-red-600 dark:bg-red-400" : outcome?.status === "cancelled" ? "bg-foreground/20" : finished ? "bg-emerald-500" : "bg-blue-500 dark:bg-blue-400",
          )}
          style={{ width: `${overall}%` }}
        />
      </span>

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
    </div>
  );
}
