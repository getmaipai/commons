"use client";

import type { ComponentProps } from "react";
import { cn } from "cn";
import { SafeImage } from "../primitives/SafeImage";
import { paper, pressable } from "./surfaces";

export interface BandImage { src: string; alt: string }
export interface BandMember { name: string; role: string; portrait?: BandImage }
export type BandAction = "make_album" | "remake_logo" | "remake_portrait" | "keep" | "remake" | "discard" | "open_app";

/**
 * MUSIC-LISTEN-C5: the chat card for a band the household made. A portrait,
 * the logo, the name, a short back story, the members and the first single
 * to judge. Actions are semantic names; the card never carries a route.
 * Names and stories are a person's own words: the card only shows them.
 */
export function Band({ name, backstory, genres = [], portrait, logo, members = [], inspiredBy, singleTitle, actions, onAction, resolveImageSrc, className, ...props }: Omit<ComponentProps<"div">, "children" | "title" | "translate"> & {
  name: string; backstory?: string; genres?: readonly string[]; portrait?: BandImage; logo?: BandImage;
  members?: readonly BandMember[]; inspiredBy?: string; singleTitle?: string; actions: readonly BandAction[];
  onAction?: (action: BandAction) => void; resolveImageSrc?: (src: string) => string;
}) {
  const url = (src: string) => (resolveImageSrc ? resolveImageSrc(src) : src);
  return <article data-slot="band" className={cn(paper, "flex w-full max-w-md flex-col gap-3 rounded-2xl p-4", className)} {...props}>
    {portrait ? <SafeImage src={url(portrait.src)} alt={portrait.alt} className="aspect-[4/3] w-full rounded-xl object-cover" /> : null}
    <div className="flex min-w-0 items-center gap-3">
      {logo ? <SafeImage src={url(logo.src)} alt={logo.alt} className="size-14 shrink-0 rounded-xl object-cover" /> : null}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[16px] font-semibold">{name}</h3>
        {genres.length ? <p className="text-muted-foreground truncate text-xs">{genres.join(" · ")}</p> : null}
        {inspiredBy ? <p className="text-muted-foreground truncate text-xs">Inspired by {inspiredBy}</p> : null}
      </div>
    </div>
    {backstory ? <p className="text-[14px] leading-relaxed">{backstory}</p> : null}
    {members.length ? <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs">{members.map((member) => <li key={`${member.name}:${member.role}`} className="flex min-w-0 items-center gap-2">
      {member.portrait ? <SafeImage src={url(member.portrait.src)} alt={member.portrait.alt} className="size-8 shrink-0 rounded-full object-cover" /> : null}
      <span className="min-w-0"><span className="block truncate font-medium">{member.name}</span><span className="text-muted-foreground block truncate">{member.role}</span></span>
    </li>)}</ul> : null}
    {singleTitle ? <p data-slot="band-single" className="border-border/70 rounded-xl border px-3 py-2 text-xs"><span className="text-muted-foreground">First single</span> <span className="font-medium">{singleTitle}</span></p> : null}
    {actions.length ? <div className="flex flex-wrap gap-2 pt-1">{actions.map((action) => <button key={action} type="button" onClick={() => onAction?.(action)} disabled={!onAction} className={cn("border-border/70 hover:bg-foreground/[0.05] focus-visible:ring-ring rounded-full border px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 disabled:cursor-default", pressable)}>{action.replaceAll("_", " ")}</button>)}</div> : null}
  </article>;
}
