"use client";

import type { ComponentProps } from "react";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "cn";
import { mono, paper } from "./surfaces";

export type BackgroundState = "running" | "ready" | "failed";

export interface BackgroundRun {
  id: string;
  title: string;
  state: BackgroundState;
  elapsed: string;
  summary?: string;
}

export function BackgroundInbox({
  runs,
  onCollect,
  calm = false,
  size = "default",
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "runs" | "onCollect" | "size"> & {
  runs: readonly BackgroundRun[];
  onCollect?: (id: string) => void;
  /** Stops the running-state spinner. Unset keeps the existing animation. */
  calm?: boolean;
  /** Comfortable raises kit-owned text to the 16px base token. */
  size?: "default" | "comfortable";
}) {
  const ready = runs.filter((run) => run.state === "ready").length;
  const running = runs.filter((run) => run.state === "running").length;

  return (
    <div
      data-slot="background-inbox"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-1 rounded-2xl p-3",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline justify-between px-1 pb-1">
        <span
          className={cn(
            "font-medium",
            size === "comfortable" ? "text-base" : "text-[13.5px]",
          )}
        >
          Running elsewhere
        </span>
        <span
          className={cn(
            mono,
            "tabular-nums",
            ready > 0
              ? "text-blue-600 dark:text-blue-400"
              : "text-muted-foreground",
            size === "comfortable" && "text-base",
          )}
        >
          {ready > 0 ? `${ready} ready` : `${running} in flight`}
        </span>
      </div>

      {runs.map((run) => {
        const className = cn(
          "flex items-center gap-2.5 rounded-xl px-1.5 py-2 text-start transition-colors",
          run.state === "running"
            ? "cursor-default"
            : onCollect
              ? "hover:bg-foreground/[0.04]"
              : undefined,
        );
        const content = (
          <>
            <span className="flex size-3.5 shrink-0 items-center justify-center">
              {run.state === "running" ? (
                <Loader2Icon className={cn("text-foreground/30 size-3", !calm && "animate-spin", "motion-reduce:animate-none")} />
              ) : run.state === "failed" ? (
                <XIcon className="size-3 text-red-500" />
              ) : (
                <CheckIcon className="size-3 text-emerald-500" />
              )}
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "truncate",
                  size === "comfortable" ? "text-base" : "text-[13px]",
                  run.state === "running"
                    ? "text-muted-foreground"
                    : "text-foreground/90",
                )}
              >
                {run.title}
              </span>
              {run.summary && (
                <span
                  className={cn(
                    mono,
                    "text-muted-foreground truncate",
                    size === "comfortable" && "text-base",
                  )}
                >
                  {run.summary}
                </span>
              )}
            </span>

            <span
              className={cn(
                mono,
                "text-muted-foreground shrink-0 tabular-nums",
                size === "comfortable" && "text-base",
              )}
            >
              {run.elapsed}
            </span>
          </>
        );

        return onCollect ? (
          <button
            key={run.id}
            type="button"
            disabled={run.state === "running"}
            onClick={() => onCollect(run.id)}
            className={className}
          >
            {content}
          </button>
        ) : (
          <div key={run.id} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
