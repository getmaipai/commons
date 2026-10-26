"use client";

import type { ComponentProps } from "react";
import { cn } from "cn";
import { SafeImage } from "../primitives/SafeImage";
import { paper, pressable } from "./surfaces";

export interface MediaFact { label: string; value: string }
export interface MediaCover { src: string; alt: string }

export function MediaCard({ cover, title, subtitle, facts = [], actions = [], onAction, resolveImageSrc, className, ...props }: Omit<ComponentProps<"div">, "children" | "title" | "translate"> & {
  cover?: MediaCover; title: string; subtitle?: string; facts?: readonly MediaFact[]; actions: readonly string[];
  onAction?: (action: string) => void; resolveImageSrc?: (src: string) => string;
}) {
  return <article data-slot="media-card" className={cn(paper, "flex w-full max-w-sm gap-3 rounded-2xl p-4", className)} {...props}>
    {cover ? <SafeImage src={resolveImageSrc ? resolveImageSrc(cover.src) : cover.src} alt={cover.alt} className="size-24 shrink-0 rounded-xl object-cover [@media(max-width:380px)]:size-20" /> : null}
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="min-w-0"><h3 className="truncate text-[14px] font-medium">{title}</h3>{subtitle ? <p className="text-muted-foreground truncate text-xs">{subtitle}</p> : null}</div>
      {facts.length ? <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">{facts.slice(0, 3).map((fact) => <div key={`${fact.label}:${fact.value}`} className="min-w-0"><dt className="text-muted-foreground truncate">{fact.label}</dt><dd className="truncate font-medium">{fact.value}</dd></div>)}</dl> : null}
      {actions.length ? <div className="flex flex-wrap gap-2 pt-1">{actions.map((action) => <button key={action} type="button" onClick={() => onAction?.(action)} disabled={!onAction} className={cn("border-border/70 hover:bg-foreground/[0.05] focus-visible:ring-ring rounded-full border px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 disabled:cursor-default", pressable)}>{action.replaceAll("_", " ")}</button>)}</div> : null}
    </div>
  </article>;
}
