"use client";

import type { ComponentProps } from "react";
import { cn } from "cn";
import { mono, paper } from "./surfaces";
import { SyntaxHighlighter } from "./shiki-highlighter";

/**
 * A read-only file view: the kit's Shiki highlighter with a line-number
 * gutter. While `streaming` the code is drawn plain (no Shiki work) and the
 * gutter grows with it; settling adds color without moving a line.
 */
export function CodeView({
  code,
  language,
  filename,
  streaming = false,
  startLine = 1,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  code: string;
  language?: string;
  /** Shown in a small header above the code. */
  filename?: string;
  streaming?: boolean;
  /** Number of the first line, for a view that starts partway into a file. */
  startLine?: number;
}) {
  const count = code.trim() === "" ? 1 : code.trim().split("\n").length;
  const numbers = Array.from({ length: count }, (_, i) => startLine + i);

  return (
    <div
      data-slot="code-view"
      data-streaming={streaming ? "" : undefined}
      className={cn(paper, "flex w-full flex-col overflow-hidden rounded-2xl", className)}
      {...props}
    >
      {filename ? (
        <div className={cn(mono, "text-foreground/90 px-4 pt-3 pb-2")}>{filename}</div>
      ) : null}
      <div className="flex overflow-x-auto">
        <div
          aria-hidden
          data-slot="code-view-gutter"
          className={cn(
            mono,
            "text-muted-foreground flex shrink-0 flex-col items-end py-3.5 ps-3.5 pe-2 text-[13px] leading-relaxed tabular-nums select-none",
          )}
        >
          {numbers.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <SyntaxHighlighter
          code={code}
          language={language ?? "text"}
          streaming={streaming}
          className="min-w-0 flex-1 [&_pre]:rounded-none [&_pre]:border-0"
        />
      </div>
    </div>
  );
}
