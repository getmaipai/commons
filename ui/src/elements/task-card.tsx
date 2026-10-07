"use client";

import { Children, type ComponentProps, type ReactNode, useState } from "react";
import {
  Ban,
  CheckIcon,
  ChevronRightIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { mono, paper } from "./surfaces";

export type TaskCardState =
  | "working"
  | "waiting"
  | "done"
  | "failed"
  | "cancelled";

const isRenderable = (node: ReactNode) =>
  node !== undefined && node !== null && node !== false && node !== true;

export function TaskStateIcon({
  state,
  calm = false,
  className,
}: {
  state: TaskCardState;
  calm?: boolean;
  className?: string;
}) {
  if (state === "done") {
    return (
      <CheckIcon
        aria-hidden
        className={cn("size-3.5 shrink-0 text-emerald-500", className)}
      />
    );
  }
  if (state === "failed") {
    return (
      <XIcon
        aria-hidden
        className={cn("text-destructive size-3.5 shrink-0", className)}
      />
    );
  }
  if (state === "cancelled") {
    return (
      <Ban
        aria-hidden
        className={cn("text-muted-foreground size-3.5 shrink-0", className)}
      />
    );
  }
  if (state === "working") {
    return (
      <Loader2Icon
        aria-hidden
        className={cn(
          "text-muted-foreground size-3.5 shrink-0",
          !calm && "animate-spin",
          "motion-reduce:animate-none",
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "border-foreground/35 m-1 size-1.5 shrink-0 rounded-full border",
        className,
      )}
    />
  );
}

export function TaskCard({
  label,
  meta,
  state,
  elapsed,
  actions,
  result,
  open,
  onOpenChange,
  children,
  calm = false,
  size = "default",
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "label"
  | "state"
  | "result"
  | "open"
  | "onOpenChange"
  | "size"
> & {
  label: string;
  meta?: string | undefined;
  state: TaskCardState;
  elapsed?: string | undefined;
  actions?: ReactNode | undefined;
  result?: ReactNode | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children?: ReactNode | undefined;
  /** Suppresses the working spinner. Unset keeps its current motion-reduced animation. */
  calm?: boolean | undefined;
  /** Comfortable raises kit-owned text to the 16px base token; default preserves current sizing. */
  size?: "default" | "comfortable" | undefined;
}) {
  const hasTranscript = Children.toArray(children).length > 0;
  const inert = open !== undefined && onOpenChange === undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div
      data-slot="task-card"
      data-state={state}
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col overflow-hidden rounded-2xl",
        className,
      )}
      {...props}
    >
      <button
        type="button"
        aria-expanded={hasTranscript ? isOpen : undefined}
        disabled={!hasTranscript || inert}
        onClick={toggle}
        className="hover:enabled:bg-foreground/[0.03] flex items-center gap-2.5 px-3.5 py-2.5 text-start transition-colors disabled:cursor-default"
      >
        <TaskStateIcon state={state} calm={calm} />
        <span className="sr-only">{state}</span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            size === "comfortable" ? "text-base" : "text-[13.5px]",
          )}
        >
          {label}
        </span>
        {meta !== undefined && (
          <span
            className={cn(
              mono,
              "text-muted-foreground max-w-24 shrink-0 truncate",
              size === "comfortable" && "text-base",
            )}
          >
            {meta}
          </span>
        )}
        {elapsed !== undefined && (
          <span
            className={cn(
              mono,
              "text-muted-foreground shrink-0 tabular-nums",
              size === "comfortable" && "text-base",
            )}
          >
            {elapsed}
          </span>
        )}
        {hasTranscript && (
          <ChevronRightIcon
            aria-hidden
            className={cn(
              "text-foreground/25 size-3 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              isOpen && "rotate-90",
            )}
          />
        )}
      </button>
      {isRenderable(actions) && (
        <div
          data-slot="task-card-actions"
          className="border-border/60 border-t px-3.5 py-2.5"
        >
          {actions}
        </div>
      )}
      {hasTranscript && isOpen && (
        <div
          data-slot="task-card-transcript"
          className={cn(
            "border-border/60 flex flex-col gap-2 border-t px-3.5 py-2.5",
            size === "comfortable" && "text-base",
          )}
        >
          {children}
        </div>
      )}
      {isRenderable(result) && (
        <div
          data-slot="task-card-result"
          className={cn(
            "border-border/60 text-foreground/70 border-t px-3.5 py-2 leading-relaxed",
            size === "comfortable" ? "text-base" : "text-xs",
          )}
        >
          {result}
        </div>
      )}
    </div>
  );
}
