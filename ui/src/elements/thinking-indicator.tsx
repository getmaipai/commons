"use client";

import type { ComponentProps } from "react";
import { cn } from "cn";
import { mono, ShimmerLabel } from "./surfaces";

export function ThinkingIndicator({
  label,
  elapsed,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "label" | "elapsed"> & {
  label: string;
  elapsed?: string;
}) {
  return (
    <div
      data-slot="thinking-indicator"
      className={cn(
        "text-foreground/55 flex items-center gap-2.5 text-sm",
        className,
      )}

      {...props}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 animate-pulse rounded-full bg-blue-500 motion-reduce:animate-none dark:bg-blue-400"
      />
      <ShimmerLabel
        key={label}
        // Firefox has no `-webkit-mask-clip: text` (tw-shimmer's own
        // `@supports` gate falls back to plain `background-clip: text`
        // there, index.css:71-76), and that background only paints
        // `100%` of this element's own box height - `leading-none`
        // (line-height: 1) left no room in that box for a descender
        // (g/p/y) to paint into, so Firefox rendered the label with its
        // descenders simply missing (reported live, reproduced only in
        // Firefox; Chrome/Safari take the mask-image branch instead,
        // unaffected). `leading-tight` gives the box the same headroom
        // `text-sm` already carries elsewhere in this file.
        //
        // tw-shimmer's own default highlight is a flat `white` (the
        // compositor/mask path's `--_overlay`) - correct on a dark
        // surface, but on this component's own light-theme resting
        // text (`text-foreground/55`, a dim dark gray) a literal white
        // band painted on top just erases that stretch of the letter
        // instead of brightening it (reported live: "wiping away part
        // of the text", Chrome, light theme). `shimmer-color-foreground`
        // ties the highlight to the same theme-aware token the resting
        // text already reads from `currentColor`, so passing the band
        // reads as the letter briefly gaining full contrast, in both
        // themes, rather than a hardcoded white/black mismatching one
        // of them.
        className="fade-in slide-in-from-bottom-1 animate-in relative inline-block leading-tight shimmer-color-foreground duration-300"
      >
        {label}
      </ShimmerLabel>
      {elapsed !== undefined && (
        <span className={cn(mono, "text-foreground/30 tabular-nums")}>
          {elapsed}
        </span>
      )}
    </div>
  );
}
