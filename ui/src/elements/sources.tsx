"use client";

import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { cn } from "cn";
import { collapsePanel, fieldInteractive, mono, paper } from "./surfaces";

export interface Source {
  domain: string;
  title: string;
}

export interface SourcesProps {
  sources: readonly Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  /** "grid" (default, unchanged): a two-column card grid, each source's
   * domain and title stacked. "list": one compact line per source (a
   * favicon glyph, then title and domain inline) - shadcn.io's own AI
   * Sources shape, for a caller that wants the source list itself
   * denser than the grid's own cards, not a caller whose reply already
   * shows the same title text (both layouts render the identical
   * title/domain fields - "list" is a denser arrangement of them, not a
   * smaller subset). */
  layout?: "grid" | "list";
  /** When true, the component renders only the `Collapsible`'s content
   * (no built-in trigger) - for a caller placing its own trigger
   * elsewhere (a message action bar, e.g.) that drives the same lifted
   * `open`/`onOpenChange` state. Default false: unchanged for every
   * existing caller, which gets the trigger bundled as before. */
  hideTrigger?: boolean;
}

/** Both layouts below use it identically - a single favicon-style
 * initial glyph keyed off the domain's own first letter, no icon fetch.
 * Exported so a caller building its own trigger (`hideTrigger`, above)
 * can reuse the identical glyph instead of a second hand-rolled copy. */
export function SourceGlyph({ domain, className }: { domain: string; className?: string }) {
  return (
    <span className={cn("bg-foreground/[0.06] text-foreground/45 flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-medium", className)}>
      {domain.charAt(0).toUpperCase()}
    </span>
  );
}

export function Sources({
  sources,
  open,
  onOpenChange,
  className,
  layout = "grid",
  hideTrigger = false,
}: SourcesProps) {
  return (
    <Collapsible
      data-slot="sources"
      open={open}
      onOpenChange={onOpenChange}
      className={cn("w-full max-w-sm", className)}
    >
      {hideTrigger ? null : (
        <CollapsibleTrigger
          className={cn(
            fieldInteractive,
            "group/trigger text-foreground/60 hover:text-foreground/90 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-xs outline-none",
          )}
        >
          <span>Sources</span>
          <span className={cn(mono, "text-foreground/35 tabular-nums")}>
            {sources.length}
          </span>
          <ChevronDownIcon className="size-3 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-open/trigger:rotate-180 group-data-panel-open/trigger:rotate-180 motion-reduce:transition-none" />
        </CollapsibleTrigger>
      )}
      <CollapsibleContent className={cn(collapsePanel, "outline-none")}>
        {/* `key={index}`, not `source.domain`: a review on the domain
         * key found two different pages on the same site produce
         * identical keys and collide - `sources` is a complete,
         * server-delivered snapshot on every known caller today (never
         * streamed/reordered/filtered client-side after mount, wire.ts's
         * own TurnValue.sources), so index stability holds for as long
         * as that's true; a caller that DOES stream/reorder this array
         * incrementally would need real per-source ids instead, not
         * shipped here since nothing calling this Element does that
         * yet. */}
        {layout === "list" ? (
          <div className="flex flex-col gap-1 pt-2.5" data-slot="sources-list">
            {sources.map((source, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg px-1 py-1"
              >
                <SourceGlyph domain={source.domain} />
                {/* `min-w-0` on both spans (a bot review on the
                 * upstream PR caught this): a flex child's default
                 * min-width is `auto`, not `0`, so `truncate` silently
                 * did nothing on either span before this - an unusually
                 * long title or domain pushed the row wider than its
                 * container instead of eliding. The domain is further
                 * capped at `max-w-[40%]` (no longer `shrink-0`) so an
                 * unusually long domain still yields most of the row to
                 * the title. */}
                <span className="text-foreground/90 min-w-0 flex-1 truncate text-[13px] leading-snug">
                  {source.title}
                </span>
                <span className={cn(mono, "text-foreground/35 min-w-0 max-w-[40%] shrink truncate text-[11px]")}>
                  {source.domain}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-2.5">
            {sources.map((source, index) => (
              <div
                key={index}
                className={cn(
                  paper,
                  "flex flex-col gap-1.5 rounded-2xl p-3 transition-transform hover:-translate-y-px",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <SourceGlyph domain={source.domain} />
                  <span className={cn(mono, "text-foreground/40 truncate")}>
                    {source.domain}
                  </span>
                </div>
                <span className="text-foreground/90 line-clamp-2 text-[13px] leading-snug font-medium">
                  {source.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
