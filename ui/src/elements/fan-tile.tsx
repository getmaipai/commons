"use client";
import type { CSSProperties } from "react";
import { FanIcon } from "lucide-react";
import { Slider } from "@/kit/ui/slider";
import { Switch } from "@/kit/ui/switch";
import { i18n } from "@/kit/i18n";

export interface FanTileProps {
  name: string;
  room: string;
  on: boolean;
  /** Speed, 0 to 100. */
  percentage: number;
  pending?: boolean;
  unavailable?: boolean;
  onToggle: () => void;
  /** Called once when the person releases the slider. */
  onPercentage: (value: number) => void;
}

/** Fan card: the icon spins (transform only), faster as the speed rises; the speed slider commits on release. */
export function FanTile({ name, room, on, percentage, pending = false, unavailable = false, onToggle, onPercentage }: FanTileProps) {
  const disabled = pending || unavailable;
  const seconds = Math.max(0.4, 2.4 - (Math.min(100, Math.max(0, percentage)) / 100) * 2);
  const spinStyle: CSSProperties = { animationDuration: `${seconds}s` };
  const state = on ? i18n._({ id: "ui.On", message: "On" }) : i18n._({ id: "ui.Off", message: "Off" });
  return (
    <article data-slot="fan-tile" data-state={on ? "on" : "off"} data-pending={pending ? "true" : undefined} className="relative flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <span aria-hidden data-slot="pending-ring" className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary transition-opacity duration-200 motion-reduce:transition-none ${pending ? "animate-pulse opacity-100 motion-reduce:animate-none" : "opacity-0"}`} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex size-11 items-center justify-center rounded-xl ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
            <FanIcon aria-hidden data-slot="fan-icon" style={spinStyle} className={`size-5 ${on && !unavailable ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">{name}</h3>
            <p className="text-muted-foreground text-xs">{room}</p>
          </div>
        </div>
        <Switch aria-label={name} checked={on} disabled={disabled} onCheckedChange={onToggle} />
      </div>
      <p className="text-xs">
        {unavailable ? i18n._({ id: "ui.Last known: {state}", message: "Last known: {state}", values: { state: on ? i18n._({ id: "ui.on", message: "on" }) : i18n._({ id: "ui.off", message: "off" }) } }) : state}
        {on && !unavailable ? ` · ${percentage}%` : ""}
        {pending ? ` · ${i18n._({ id: "ui.Updating…", message: "Updating…" })}` : ""}
      </p>
      <Slider aria-label={i18n._({ id: "ui.{name} speed", message: "{name} speed", values: { name } })} min={0} max={100} step={1} value={[percentage]} disabled={disabled || !on} onValueCommit={([v]) => { if (v !== undefined) onPercentage(v); }} />
    </article>
  );
}
