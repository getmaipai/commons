"use client";

import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/elements/ui/collapsible";
import { cn } from "cn";
import { collapsePanel, ShimmerLabel, SwapLabel } from "./surfaces";
import { take } from "./range";
import { Source, SourceIcon, SourceTitle } from "./sources.aui";

export interface TimelineSite {
  host: string;
  url: string;
}

export interface TimelineStep {
  verb: string;
  chip: string;
  icon: LucideIcon;
  /** TOOL-EVENTS-02: the sites a search step actually read - a weather
   * or almanac step reads no page, so this stays empty for those. */
  sites?: readonly TimelineSite[];
}

export interface TimelineStat {
  file: string;
  added?: number;
  removed?: number;
}

export interface ToolTimelineProps {
  steps: readonly TimelineStep[];
  visibleSteps: number;
  streaming: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restingLabel: string;
  activeLabel: string;
  stats: TimelineStat[];
  className?: string;
  /** TOOL-EVENTS-02: swaps `SourceIcon`'s own upstream favicon default
   * for a caller's own proxy (home's `/api/favicon`, SRC-ICON-01) - the
   * kit never hardcodes a home route, the same seam `SourcesFooterContent`
   * (NextChatPage.tsx) already passes into `SourceIcon` directly. */
  faviconUrl?: (domain: string) => string;
}

export function ToolTimeline({
  steps,
  visibleSteps,
  streaming,
  open,
  onOpenChange,
  restingLabel,
  activeLabel,
  stats,
  className,
  faviconUrl,
}: ToolTimelineProps) {
  return (
    <Collapsible
      data-slot="tool-timeline"
      open={open}
      onOpenChange={onOpenChange}
      className={cn("w-full max-w-sm", className)}
    >
      <CollapsibleTrigger className="group/trigger text-foreground/55 hover:text-foreground/90 flex items-center gap-1.5 rounded-md py-1 text-[13.5px] transition-colors outline-none">
        <ChevronRightIcon className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-open/trigger:rotate-90 group-data-panel-open/trigger:rotate-90 motion-reduce:transition-none" />
        <SwapLabel
          active={streaming ? 0 : 1}
          className="text-start tabular-nums"
        >
          <ShimmerLabel
            active={streaming}
            className="relative inline-block leading-none"
          >
            {activeLabel}
          </ShimmerLabel>
          <>{restingLabel}</>
        </SwapLabel>
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(collapsePanel, "outline-none")}>
        <div className="flex flex-col gap-2.5 ps-4 pt-2.5">
          {take(steps, visibleSteps).map((step, index, shown) => {
            const Icon = step.icon;
            const active = streaming && index === shown.length - 1;

            return (
              <div
                // `key={index}`, not `step.chip`: a review on a consumer
                // calling the same package twice in one turn found two
                // steps with the identical chip text collide on an
                // identical key - `steps` is a plain array handed to the
                // component once per render, not reordered/filtered
                // after the fact, so index stability holds (the same
                // reasoning `elements/sources.tsx` already documents for
                // its own index-keyed rows).
                key={index}
                className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both flex flex-col gap-1.5 duration-300"
              >
                <div className="text-foreground/55 flex items-center gap-2 text-[13.5px]">
                  <Icon className="text-foreground/35 size-3.5 shrink-0" />
                  <ShimmerLabel
                    active={active}
                    className="relative inline-block leading-none"
                  >
                    {step.verb}
                  </ShimmerLabel>
                  <span className="bg-foreground/[0.06] text-foreground/70 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                    {step.chip}
                  </span>
                </div>
                {step.sites && step.sites.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ps-5.5">
                    {step.sites.map((site) => (
                      <Source
                        key={site.url}
                        href={site.url}
                        referrerPolicy="no-referrer"
                        variant="muted"
                        size="sm"
                      >
                        <SourceIcon url={site.url} faviconUrl={faviconUrl} />
                        <SourceTitle>{site.host}</SourceTitle>
                      </Source>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {stats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {stats.map((stat) => (
                <span
                  key={stat.file}
                  className="bg-foreground/[0.06] text-foreground/70 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px]"
                >
                  <span>{stat.file}</span>
                  {stat.added !== undefined && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{stat.added}
                    </span>
                  )}
                  {stat.removed !== undefined && (
                    <span className="text-red-600 dark:text-red-400">
                      −{stat.removed}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
