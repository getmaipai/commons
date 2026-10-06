"use client";

import type { ComponentProps } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "cn";

export const paper = "bg-background border border-border/60 dark:bg-popover";

export const floating = "bg-background border border-border/60 dark:bg-popover";

export const field = "bg-foreground/[0.04] dark:bg-foreground/[0.06]";

export const fieldInteractive =
  "bg-foreground/[0.04] transition-colors hover:bg-foreground/[0.07] dark:bg-foreground/[0.06] dark:hover:bg-foreground/[0.09]";

export const pressable =
  "transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] motion-reduce:transition-none";

export const ghostButton =
  "flex items-center justify-center rounded-full text-muted-foreground outline-none transition-[background-color,color,scale] duration-150 hover:bg-foreground/[0.06] hover:text-foreground/90 active:scale-[0.96] focus-visible:ring-1 focus-visible:ring-foreground/20 motion-reduce:transition-none dark:hover:bg-foreground/[0.09]";

export const inkButton =
  "bg-foreground text-background transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:opacity-90 active:scale-[0.96] motion-reduce:transition-none";

export const iconSwap =
  "[grid-area:1/1] transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";

export const iconSwapIn = "scale-100 opacity-100 blur-none";

export const iconSwapOut = "scale-[0.25] opacity-0 blur-[4px]";

export const labelSwap =
  "col-start-1 row-start-1 flex w-max items-center gap-1.5 leading-none transition-[opacity,filter] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";

export const labelSwapIn = "opacity-100 blur-none";

export const labelSwapOut =
  "pointer-events-none select-none opacity-0 blur-[2px]";

// Jesse found this live (2026-09-27): every collapsible built on this
// token (ToolTimeline's own "N tool calls", the chat's own Sources
// footer) opened and closed with no visible transition at all - proven
// live with a real `transitionend` listener, which never fired.
//
// Two real, separate bugs, not one:
//
// 1. The class read `h-(--collapsible-panel-height)` - Tailwind v4's
//    shorthand for `height: var(--collapsible-panel-height)`, no
//    fallback - but nothing anywhere ever sets a variable of that exact
//    name; Radix's own Collapsible sets `--radix-collapsible-content-
//    height` on the content element instead (confirmed live via the
//    element's own inline style).
//
// 2. Even with that name fixed, `transition-[height]` still can't work
//    here: Radix sets `--radix-collapsible-content-height` ONCE, to the
//    measured content height, and never changes it again on close
//    (confirmed live: the inline style still read the same px value
//    long after `data-state` flipped to "closed" and Radix had already
//    added its own `hidden` attribute) - a `transition` needs a
//    property to actually CHANGE value over time to have anything to
//    interpolate, and this one never does. `data-[ending-style]`/
//    `data-[starting-style]` (the previous attempt's own guess at how
//    to reach 0) aren't real attributes anything sets either - dead
//    selectors that never matched.
//
// The right technique is a real CSS `animation`, not a `transition`:
// this file's own `globals.css` already defines `@keyframes
// collapsible-down`/`collapsible-up` (nested in `@theme`, so still
// emitted as ordinary global keyframes any `animate-[name_...]`
// arbitrary value can reference by name) reading the identical
// Radix-then-manual fallback chain - built for exactly this, just never
// wired to an actual `animate-*` utility until now. `_forwards` keeps
// the CLOSING animation's own end state (height 0) in place instead of
// snapping back to `auto` the instant the animation finishes, before
// Radix's own Presence detection gets a chance to add `hidden`.
export const collapsePanel =
  "overflow-hidden data-[state=open]:animate-[collapsible-down_200ms_cubic-bezier(0.32,0.72,0,1)_forwards] data-[state=closed]:animate-[collapsible-up_200ms_cubic-bezier(0.32,0.72,0,1)_forwards] motion-reduce:animate-none";

export const live = "text-blue-500 dark:text-blue-400";

export const mono = "font-mono text-[11px] tracking-tight";

export function ShimmerLabel({
  active = true,
  className,
  ...props
}: ComponentProps<"span"> & { active?: boolean }) {
  return (
    <span
      className={cn(active && "shimmer motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

/**
 * Scroll region for content that keeps its own whitespace. `whitespace-pre` in
 * a bounded box clips a long line with no way to reach it, so the rows scroll
 * instead.
 *
 * `codeSurface` wraps all the rows as one block, and the rows are its children.
 * It cannot go on each row: `min-width: 100%` resolves against the scroll
 * container's visible width rather than its scroll width, so a per-row width
 * leaves every row except the longest ending its background at the fold.
 */
export const codeScroll = "overflow-x-auto";

export const codeSurface = "w-max min-w-full";

export function SwapLabel({
  active,
  children,
  className,
}: {
  active: 0 | 1;
  children: [React.ReactNode, React.ReactNode];
  className?: string;
}) {
  const layers = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const target = layers[active]?.current;
    if (!target) return undefined;
    const measure = () =>
      setWidth(Math.ceil(target.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [active]);

  return (
    <span
      style={width === null ? undefined : { width }}
      className={cn(
        "grid overflow-x-clip transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
        className,
      )}
    >
      {children.map((layer, index) => (
        <span
          key={index}
          ref={layers[index]}
          aria-hidden={active !== index}
          className={cn(
            labelSwap,
            active === index ? labelSwapIn : labelSwapOut,
          )}
        >
          {layer}
        </span>
      ))}
    </span>
  );
}
