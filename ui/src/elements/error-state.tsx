"use client";

/* modified:
 * - Replace the raw red failure panel with the kit's muted text and icon
 *   colors; leave the failure unfilled and keep Retry as a text action.
 */

import type { ComponentProps } from "react";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "cn";
import { ShimmerLabel } from "./surfaces";

export interface ErrorStateProps extends Omit<
  ComponentProps<"div">,
  "children" | "role"
> {
  title: string;
  detail: string;
  retrying: boolean;
  onRetry: () => void;
}

export function ErrorState({
  title,
  detail,
  retrying,
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  if (retrying) {
    return (
      <div
        data-slot="error-state"
        key="retrying"
        role="status"
        className={cn(
          "fade-in animate-in flex w-full max-w-sm items-center gap-2.5 text-sm duration-300 motion-reduce:animate-none",
          className,
        )}

        {...props}
      >
        <RefreshCwIcon className="text-foreground/45 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        <ShimmerLabel className="text-foreground/55 relative inline-block">
          Retrying
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
        "fade-in animate-in flex w-full max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm duration-300 motion-reduce:animate-none",
        className,
      )}

      {...props}
    >
      <CircleAlertIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div>
        <p className="text-muted-foreground font-medium">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-[13px] leading-snug">
          {detail}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="text-muted-foreground hover:text-foreground ms-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
      >
        <RefreshCwIcon className="size-3" />
        Retry
      </button>
    </div>
  );
}
