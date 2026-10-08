"use client";

import type { ComponentProps, ReactNode } from "react";
import { AlertCircleIcon, Loader2Icon, RotateCwIcon } from "lucide-react";
import { cn } from "cn";
import { field, mono, paper } from "./surfaces";

export function ToolError({
  name,
  target,
  message,
  attempt,
  maxAttempts,
  retrying = false,
  onRetry,
  onSkip,
  retryLabel = "Retry",
  retryingLabel = "Retrying",
  skipLabel = "Skip",
  details,
  detailsLabel = "Details",
  actions,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "name"
  | "target"
  | "message"
  | "attempt"
  | "maxAttempts"
  | "retrying"
  | "onRetry"
  | "onSkip"
  | "retryLabel"
  | "retryingLabel"
  | "skipLabel"
  | "details"
  | "detailsLabel"
  | "actions"
> & {
  name: string;
  target: string;
  message: string;
  /** The counter shows only when both `attempt` and `maxAttempts` are given. */
  attempt?: number;
  maxAttempts?: number;
  retrying?: boolean;
  /** The Retry button is drawn only when this is given (or while retrying). */
  onRetry?: () => void;
  /** The Skip button is drawn only when this is given. */
  onSkip?: () => void;
  retryLabel?: string;
  retryingLabel?: string;
  skipLabel?: string;
  /** Extra content (cause, next step, fact rows), drawn in a collapsed disclosure under the message. */
  details?: ReactNode;
  /** Summary text of the `details` disclosure. */
  detailsLabel?: string;
  /** Host-supplied controls (e.g. Copy details, a Repairs link), drawn in the action row before Skip and Retry. */
  actions?: ReactNode;
}) {
  const showCounter = attempt !== undefined && maxAttempts !== undefined;
  const hasActions = actions !== undefined && actions !== null && actions !== false;
  const showActions =
    onSkip !== undefined || onRetry !== undefined || retrying || hasActions;
  return (
    <div
      data-slot="tool-error"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-3.5",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        <AlertCircleIcon className="size-3.5 shrink-0 text-red-500" />
        <span className={cn(mono, "text-muted-foreground shrink-0")}>{name}</span>
        <span className="text-foreground/80 min-w-0 flex-1 truncate text-[13px]">
          {target}
        </span>
        {showCounter && (
          <span
            className={cn(mono, "text-muted-foreground shrink-0 tabular-nums")}
          >
            {attempt}/{maxAttempts}
          </span>
        )}
      </div>

      <div
        className={cn(
          field,
          "rounded-xl px-3 py-2 font-mono text-[11px] leading-relaxed text-red-700 dark:text-red-300",
        )}
      >
        {message}
      </div>

      {details !== undefined && details !== null && details !== false && (
        <details
          data-slot="tool-error-details"
          className="group text-foreground/80 text-xs"
        >
          <summary className="text-muted-foreground hover:text-foreground/90 cursor-pointer select-none text-xs font-medium">
            {detailsLabel}
          </summary>
          <div className="mt-2 flex flex-col gap-1.5">{details}</div>
        </details>
      )}

      {showActions && (
        <div className="flex items-center justify-end gap-2">
          {hasActions && (
            <div
              data-slot="tool-error-actions"
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              {actions}
            </div>
          )}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground/90 h-7 rounded-full px-2.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30"
            >
              {skipLabel}
            </button>
          )}
          {(onRetry || retrying) && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground/95 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none"
            >
              {retrying ? (
                <Loader2Icon className="size-3 animate-spin motion-reduce:animate-none" />
              ) : (
                <RotateCwIcon className="size-3" />
              )}
              {retrying ? retryingLabel : retryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
