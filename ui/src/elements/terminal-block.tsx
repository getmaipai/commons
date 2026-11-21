"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "cn";
import { mono, paper } from "./surfaces";

export function TerminalBlock({
  command,
  lines,
  visibleCount,
  done,
  streaming = false,
  followTail = streaming,
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
  "children" | "command" | "lines" | "visibleCount" | "done" | "streaming" | "followTail" | "variant"
  | "exitCode" | "stderr" | "cwd" | "durationMs" | "truncated" | "maxCollapsedLines"
> & {
  command: string;
  lines: readonly string[];
  /** Reveal animation: how many lines show. Ignored while `streaming`. */
  visibleCount?: number;
  done: boolean;
  /** `lines` and `stderr` grow as output arrives: every line shows, none re-animates. */
  streaming?: boolean;
  /** Keeps the view at the end as output arrives, until the person scrolls up. Defaults to `streaming`. */
  followTail?: boolean;
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
  const limit = streaming
    ? (maxCollapsedLines ?? outputLines.length)
    : (maxCollapsedLines ?? visibleCount ?? outputLines.length);
  const bodyRef = useRef<HTMLDivElement>(null);
  const atTail = useRef(true);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (followTail && el && atTail.current) el.scrollTop = el.scrollHeight;
  }, [followTail, outputLines.length]);
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
            {exitCode === 0 ? <CheckIcon className="size-3 text-status-ok" /> : <XIcon className="size-3 text-destructive" />}
            <span
              className={cn(
                mono,
                exitCode !== 0 ? "text-destructive" : ink
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
        ref={bodyRef}
        role={streaming ? "log" : undefined}
        data-follow-tail={followTail ? "" : undefined}
        onScroll={
          followTail
            ? (event) => {
                const el = event.currentTarget;
                atTail.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 8;
              }
            : undefined
        }
        className={cn(
          "flex min-h-[8.5rem] flex-col gap-1 px-4 pt-1 pb-3.5",
          followTail && "max-h-72 overflow-y-auto",
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
                !streaming && "fade-in animate-in fill-mode-both duration-300",
                isStderr && "text-destructive",
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
            className="inline-block h-3 w-1.5 animate-pulse bg-primary/70 motion-reduce:animate-none"
          />
        )}
      </div>
    </div>
  );
}
