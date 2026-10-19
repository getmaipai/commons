"use client";

/* modified:
 * - Replace the raw red failure panel with the kit's muted text and icon
 *   colors; leave the failure unfilled and keep Retry as a text action.
 */

import type { ComponentProps } from "react";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "cn";
import { ShimmerLabel } from "./surfaces";
import { Button } from "./ui/button";

export interface ErrorStateProps extends Omit<
  ComponentProps<"div">,
  "children" | "role"
> {
  title: string;
  /** Unset: only the title is drawn. */
  detail?: string;
  retrying: boolean;
  /** Unset: no Retry button is drawn. */
  onRetry?: () => void;
  /** `stacked` (default) puts the message above a full-width retry action.
   * `inline` drops the width cap and padding; `card` keeps the legacy inline card. */
  layout?: "stacked" | "card" | "inline";
  retryLabel?: string;
  /** ENGINE-DOWN-UI-01: holds Retry (disabled, this reason in its accessible name) while what it would retry cannot answer. */
  retryDisabled?: string | undefined;
  retryingLabel?: string;
}

export function ErrorState({
  title,
  detail,
  retrying,
  onRetry,
  layout = "stacked",
  retryLabel = "Retry",
  retryDisabled,
  retryingLabel = "Retrying",
  className,
  ...props
}: ErrorStateProps) {
  const inline = layout === "inline";
  const stacked = layout === "stacked";
  if (retrying) {
    return (
      <div
        data-slot="error-state"
        key="retrying"
        role="status"
        className={cn(
          inline
            ? "fade-in animate-in flex w-full items-center gap-2.5 text-sm duration-300 motion-reduce:animate-none"
            : stacked
              ? "fade-in animate-in flex w-full flex-col items-start gap-2.5 text-sm duration-300 motion-reduce:animate-none"
              : "fade-in animate-in flex w-full max-w-sm items-center gap-2.5 text-sm duration-300 motion-reduce:animate-none",
          className,
        )}

        {...props}
      >
        <RefreshCwIcon className="text-foreground/45 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        <ShimmerLabel className="text-muted-foreground relative inline-block">
          {retryingLabel}
        </ShimmerLabel>
      </div>
    );
  }

  return (
    <div
      data-slot="error-state"
      key="error"
      role="alert"
      className={cn(
        inline
          ? "fade-in animate-in flex w-full items-start gap-2.5 text-sm duration-300 motion-reduce:animate-none"
          : stacked
            ? "fade-in animate-in flex w-full flex-col items-start gap-2.5 text-sm duration-300 motion-reduce:animate-none"
            : "fade-in animate-in flex w-full max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm duration-300 motion-reduce:animate-none",
        className,
      )}

      {...props}
    >
      <div className={stacked ? "flex min-w-0 items-start gap-2.5" : "contents"}>
      <CircleAlertIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground font-medium">{title}</p>
        {detail !== undefined && (
          <p className="text-muted-foreground mt-0.5 text-[13px] leading-snug">
            {detail}
          </p>
        )}
      </div>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="ghost"
          size="default"
          onClick={onRetry}
          disabled={retryDisabled !== undefined}
          className={cn("text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50 h-12 shrink-0 gap-1.5 rounded-full px-3 text-xs font-medium transition-colors whitespace-nowrap", stacked ? "self-start" : "ms-auto")}
        >
          <RefreshCwIcon className="size-4" />
          {retryLabel}
          {retryDisabled !== undefined && <span className="sr-only">. {retryDisabled}</span>}
        </Button>
      )}
    </div>
  );
}
