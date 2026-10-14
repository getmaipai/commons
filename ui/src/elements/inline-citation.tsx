"use client";

import { useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { PreviewCard } from "@base-ui/react/preview-card";
import { cn } from "cn";
import { floating, mono } from "./surfaces";

export interface Source {
  domain: string;
  title: string;
  snippet?: string;
  /** Optional extra line (a licence and snapshot date, e.g.) under the title. */
  detail?: string;
  href?: string;
}

interface CitationProps {
  index: number;
  source: Source;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId?: string;
}

export function Citation({ index, source, open, onOpenChange, tourId }: CitationProps) {
  // A touch screen has no hover, and a tapped button does not always take focus (iOS), so a chip without a link
  // opens its excerpt on tap and closes on a second tap or a tap elsewhere. A chip with a link stays a link.
  const triggerEl = useRef<HTMLElement | null>(null);
  const touchStartedOpen = useRef<boolean | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const target = event.target as Element | null;
      if (target && (triggerEl.current?.contains(target) || target.closest("[data-citation-popup]"))) return;
      onOpenChange(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, onOpenChange]);
  return (
    <PreviewCard.Root open={open} onOpenChange={onOpenChange}>
      <PreviewCard.Trigger
        ref={(node: HTMLElement | null) => { triggerEl.current = node; }}
        delay={0}
        data-tour={tourId}
        onPointerDown={(event) => { touchStartedOpen.current = event.pointerType === "touch" ? open : null; }}
        onClick={source.href ? undefined : () => {
          // Decided from the state at the start of the tap, so a hover or focus the browser fires first cannot undo it.
          if (touchStartedOpen.current !== null) onOpenChange(!touchStartedOpen.current);
          touchStartedOpen.current = null;
        }}
        render={source.href ? <a href={source.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" /> : <button type="button" />}
        className={cn(
          "mx-0.5 inline-flex h-4 min-w-4 translate-y-[-2px] cursor-default items-center justify-center rounded-[5px] px-1 align-middle font-mono text-[10px] font-medium tabular-nums transition-colors",
          open
            ? "bg-foreground text-background"
            : "bg-foreground/[0.06] text-muted-foreground hover:text-foreground/90",
        )}
      >
        {index + 1}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner side="top" sideOffset={8}>
          <PreviewCard.Popup
            data-citation-popup=""
            className={cn(
              floating,
              "z-50 w-64 origin-(--transform-origin) rounded-2xl p-3.5 outline-none",
              "transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
              "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0",
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="bg-foreground/[0.06] text-muted-foreground flex size-4 items-center justify-center rounded text-[9px] font-medium">
                {source.domain[0]?.toUpperCase()}
              </span>
              <span className={cn(mono, "text-muted-foreground")}>
                {source.domain}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-snug font-medium">
              {source.title}
            </p>
            {source.detail ? <p data-slot="source-detail" className="text-muted-foreground mt-0.5 text-[11px] leading-snug break-words">{source.detail}</p> : null}
            {source.snippet ? <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{source.snippet}</p> : null}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

export interface InlineCitationProps extends Omit<
  ComponentProps<"p">,
  "children"
> {
  sources: Source[];
  openIndex: number | null;
  onOpenIndexChange: (index: number | null) => void;
}

export function InlineCitation({
  sources,
  openIndex,
  onOpenIndexChange,
  className,
  ...props
}: InlineCitationProps) {
  return (
    <p
      data-slot="inline-citation"
      className={cn(
        "text-foreground/90 max-w-sm text-sm leading-relaxed",
        className,
      )}

      {...props}
    >
      Optimistic updates keep the thread responsive while the server confirms
      the write
      {sources[0] && (
        <Citation
          index={0}
          source={sources[0]}
          open={openIndex === 0}
          onOpenChange={(open) => onOpenIndexChange(open ? 0 : null)}
        />
      )}
      . The store already exposes a consistent snapshot for every subscriber
      {sources[1] && (
        <Citation
          index={1}
          source={sources[1]}
          open={openIndex === 1}
          onOpenChange={(open) => onOpenIndexChange(open ? 1 : null)}
        />
      )}
      , so no extra reconciliation pass is needed.
    </p>
  );
}
