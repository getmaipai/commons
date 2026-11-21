"use client";

import type { ComponentProps, ReactNode } from "react";
import { MessageSquarePlusIcon } from "lucide-react";
import { cn } from "cn";
import { codeScroll, codeSurface, mono, paper } from "./surfaces";

export type DiffKind = "context" | "added" | "removed";

export interface DiffLine {
  kind: DiffKind;
  text: string;
  /** Line number in the file; `onLineComment` reports it. Defaults to the 1-based row. */
  line?: number;
}

/** The hover button that adds a comment on one diff line. */
export function LineCommentButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground/90 ms-auto flex shrink-0 items-center ps-3 opacity-0 transition-opacity duration-150 group-hover/line:opacity-100 focus-visible:opacity-100"
    >
      <MessageSquarePlusIcon className="size-3" />
    </button>
  );
}

export function defaultCommentLabel(line: number) {
  return `Comment on line ${line}`;
}

const GUTTER: Record<DiffKind, string> = {
  context: "",
  added: "+",
  removed: "−",
};

export function CodeDiff({
  filename,
  additions,
  deletions,
  lines,
  cycle = 0,
  compareLabel,
  onLineComment,
  commentLabel = defaultCommentLabel,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "filename" | "additions" | "deletions" | "lines" | "cycle" | "compareLabel"
> & {
  filename: string;
  additions: number;
  deletions: number;
  lines: readonly DiffLine[];
  /** Restarts the reveal animation when it changes; off by default. */
  cycle?: number;
  /** Names what the diff is compared against, for example "vs main". */
  compareLabel?: ReactNode;
  /** Hover a line to add a comment; receives the filename and line number. */
  onLineComment?: (path: string, line: number) => void;
  commentLabel?: (line: number) => string;
}) {
  return (
    <div
      data-slot="code-diff"
      className={cn(
        paper,
        "w-full max-w-md overflow-hidden rounded-2xl font-mono text-xs",
        className,
      )}

      {...props}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-foreground/90">{filename}</span>
        {compareLabel ? (
          <span className={cn(mono, "text-muted-foreground ms-2 me-auto")}>
            {compareLabel}
          </span>
        ) : null}
        <span className={cn(mono, "tabular-nums")}>
          <span className="text-status-ok-ink">
            +{additions}
          </span>{" "}
          <span className="text-destructive">−{deletions}</span>
        </span>
      </div>
      <div className={codeScroll}>
        <div className={codeSurface}>
          {lines.map((line, i) => (
            <div
              key={`${cycle}-${i}-${line.text}`}
              className={cn(
                onLineComment && "group/line",
                "fade-in animate-in fill-mode-both flex px-4 py-0.5 leading-relaxed whitespace-pre duration-300",
                line.kind === "context" && "text-muted-foreground",
                line.kind === "added" &&
                  "bg-status-ok/10 text-status-ok-ink",
                line.kind === "removed" &&
                  "bg-destructive/10 text-destructive",
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="w-4 shrink-0 select-none">
                {GUTTER[line.kind]}
              </span>
              <span>{line.text}</span>
              {onLineComment ? (
                <LineCommentButton
                  label={commentLabel(line.line ?? i + 1)}
                  onClick={() => onLineComment(filename, line.line ?? i + 1)}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
