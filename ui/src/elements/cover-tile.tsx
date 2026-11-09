"use client";
import { ArrowDownIcon, ArrowUpIcon, SquareIcon } from "lucide-react";
import { i18n } from "@/kit/i18n";
import { PRESS } from "@/kit/utils";

export interface CoverTileProps {
  name: string;
  room: string;
  /** 0 is closed, 100 is fully open. */
  position: number;
  pending?: boolean;
  unavailable?: boolean;
  onOpen: () => void;
  onStop: () => void;
  onClose: () => void;
}

/** Blind, shade or garage cover: the fill follows the position (a scaleY transform), with open, stop and close buttons. */
export function CoverTile({ name, room, position, pending = false, unavailable = false, onOpen, onStop, onClose }: CoverTileProps) {
  const open = Math.min(100, Math.max(0, position));
  const disabled = pending || unavailable;
  const label = open === 0 ? i18n._({ id: "ui.Closed", message: "Closed" }) : open === 100 ? i18n._({ id: "ui.Open", message: "Open" }) : i18n._({ id: "ui.Open {percent}%", message: "Open {percent}%", values: { percent: open } });
  return (
    <article data-slot="cover-tile" data-pending={pending ? "true" : undefined} className="relative flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <span aria-hidden data-slot="pending-ring" className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary transition-opacity duration-200 motion-reduce:transition-none ${pending ? "animate-pulse opacity-100 motion-reduce:animate-none" : "opacity-0"}`} />
      <div className="flex items-center gap-3">
        <span className="relative flex size-11 overflow-hidden rounded-xl bg-muted" role="img" aria-label={label}>
          <span data-slot="cover-fill" style={{ transform: `scaleY(${(100 - open) / 100})` }} className="absolute inset-0 origin-top bg-primary/70 transition-transform duration-500 motion-reduce:transition-none" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{name}</h3>
          <p className="text-muted-foreground text-xs">{room}</p>
        </div>
      </div>
      <p className="text-xs">
        {unavailable ? i18n._({ id: "ui.Last known: {state}", message: "Last known: {state}", values: { state: label.toLowerCase() } }) : label}
        {pending ? ` · ${i18n._({ id: "ui.Updating…", message: "Updating…" })}` : ""}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" aria-label={i18n._({ id: "ui.Open {name}", message: "Open {name}", values: { name } })} disabled={disabled || open === 100} onClick={onOpen} className={`flex min-h-12 items-center justify-center rounded-xl bg-muted text-foreground ${PRESS} disabled:opacity-50`}><ArrowUpIcon className="size-5" aria-hidden /></button>
        <button type="button" aria-label={i18n._({ id: "ui.Stop {name}", message: "Stop {name}", values: { name } })} disabled={unavailable} onClick={onStop} className={`flex min-h-12 items-center justify-center rounded-xl bg-muted text-foreground ${PRESS} disabled:opacity-50`}><SquareIcon className="size-4" aria-hidden /></button>
        <button type="button" aria-label={i18n._({ id: "ui.Close {name}", message: "Close {name}", values: { name } })} disabled={disabled || open === 0} onClick={onClose} className={`flex min-h-12 items-center justify-center rounded-xl bg-muted text-foreground ${PRESS} disabled:opacity-50`}><ArrowDownIcon className="size-5" aria-hidden /></button>
      </div>
    </article>
  );
}
