"use client";

import type { ComponentProps } from "react";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "cn";
import { mono, paper } from "./surfaces";

export function TerminalBlock({
  command,
  lines,
  visibleCount,
  done,
  variant = "paper",
  exitCode = 0,
  stderr = [],
  cwd,
  durationMs,
  truncated = false,
  maxCollapsedLines,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "command" | "lines" | "visibleCount" | "done" | "variant"
  | "exitCode" | "stderr" | "cwd" | "durationMs" | "truncated" | "maxCollapsedLines"
> & {
  command: string;
  lines: readonly string[];
  visibleCount: number;
  done: boolean;
  variant?: "paper" | "ink";
  exitCode?: number;
  stderr?: readonly string[];
  cwd?: string;
  durationMs?: number;
  truncated?: boolean;
  maxCollapsedLines?: number;
}) {
  const ink = variant === "ink";
  const outputLines = [...lines.map((line) => ({ line, stderr: false })), ...stderr.map((line) => ({ line, stderr: true }))];
  const limit = maxCollapsedLines ?? visibleCount;
  const shownLines = outputLines.slice(0, Math.max(0, limit));

  return (
    <div
      data-slot="terminal-block"
      data-state={done ? (exitCode === 0 ? "success" : "failure") : "running"}
      className={cn(
        ink ? "bg-foreground dark:bg-popover" : paper,
        "w-full max-w-md overflow-hidden rounded-2xl font-mono text-xs",
        className,
      )}

      {...props}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <span
          className={cn(
            ink
              ? "text-background/90 dark:text-foreground/90"
              : "text-foreground/90",
          )}
        >
          {command}
        </span>
        {done ? (
          <div className="flex items-center gap-1">
            {exitCode === 0 ? <CheckIcon className="size-3 text-emerald-500" /> : <XIcon className="size-3 text-red-600 dark:text-red-400" />}
            <span
              className={cn(
                mono,
                exitCode !== 0 ? "text-red-600 dark:text-red-400" : ink
                  ? "text-background/60 dark:text-muted-foreground"
                  : "text-muted-foreground",
              )}
            >
              exit {exitCode}
            </span>
          </div>
        ) : (
          <Loader2Icon
            className={cn(
              "size-3 animate-spin motion-reduce:animate-none",
              ink
                ? "text-background/35 dark:text-muted-foreground"
                : "text-muted-foreground",
            )}
          />
        )}
      </div>
      {(cwd || durationMs !== undefined || truncated) && <div className="text-muted-foreground px-4 pb-1">{cwd}{cwd && durationMs !== undefined ? " · " : ""}{durationMs !== undefined ? `${Math.max(0, Math.round(durationMs / 1000))}s` : ""}{truncated ? " · output truncated" : ""}</div>}
      <div
        className={cn(
          "flex min-h-[8.5rem] flex-col gap-1 px-4 pt-1 pb-3.5",
          ink
            ? "text-background/60 dark:text-muted-foreground"
            : "text-muted-foreground",
        )}
      >
        {shownLines.map(({ line, stderr: isStderr }, i) => {
          const isLast = i === shownLines.length - 1;
          return (
            <div
              key={`${i}-${line}`}
              data-stream={isStderr ? "stderr" : "stdout"}
              className={cn(
                "fade-in animate-in fill-mode-both duration-300",
                isStderr && "text-red-600 dark:text-red-400",
                (isLast && !isStderr) &&
                  (ink
                    ? "text-background/90 dark:text-foreground/90"
                    : "text-foreground/90"),
              )}
            >
              {line}
            </div>
          );
        })}
        {(truncated || outputLines.length > shownLines.length) && <span className="text-muted-foreground">…</span>}
        {!done && (
          <span
            aria-hidden
            className="inline-block h-3 w-1.5 animate-pulse bg-blue-500/70 motion-reduce:animate-none dark:bg-blue-400/70"
          />
        )}
      </div>
    </div>
  );
}
