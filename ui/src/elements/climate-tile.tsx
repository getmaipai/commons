"use client";
import { MinusIcon, PlusIcon } from "lucide-react";
import { i18n } from "@/kit/i18n";
import { PRESS } from "@/kit/utils";
import { formatTileNumber } from "@/kit/format";

export type ClimateMode = "heat" | "cool" | "off";

export interface ClimateTileProps {
  name: string;
  room: string;
  mode: ClimateMode;
  /** Current temperature, in the display unit. */
  current: number;
  /** Setpoint, in the display unit. */
  target: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  pending?: boolean;
  unavailable?: boolean;
  onTarget: (value: number) => void;
}

const SWEEP = 270;
/** Climate card: a dial whose setpoint thumb rotates (transform only) with a heat or cool glow (opacity only); plus and minus buttons are the accessible control. */
export function ClimateTile({ name, room, mode, current, target, min, max, step = 0.5, unit = "°", pending = false, unavailable = false, onTarget }: ClimateTileProps) {
  const disabled = pending || unavailable;
  const span = Math.max(1, max - min);
  const fraction = Math.min(1, Math.max(0, (target - min) / span));
  const angle = -SWEEP / 2 + fraction * SWEEP;
  const nudge = (delta: number) => onTarget(Math.min(max, Math.max(min, Math.round((target + delta) / step) * step)));
  const modeLabel = mode === "heat" ? i18n._({ id: "ui.Heating", message: "Heating" }) : mode === "cool" ? i18n._({ id: "ui.Cooling", message: "Cooling" }) : i18n._({ id: "ui.Off", message: "Off" });
  const glow = mode === "heat" ? "bg-chart-1" : mode === "cool" ? "bg-chart-2" : "bg-muted";
  return (
    <article data-slot="climate-tile" data-mode={mode} data-pending={pending ? "true" : undefined} className="relative isolate flex w-full max-w-sm flex-col items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <span aria-hidden data-slot="climate-glow" className={`pointer-events-none absolute inset-0 -z-10 transition-opacity duration-500 motion-reduce:transition-none ${glow} ${mode === "off" ? "opacity-0" : "opacity-15"}`} />
      <span aria-hidden data-slot="pending-ring" className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary transition-opacity duration-200 motion-reduce:transition-none ${pending ? "animate-pulse opacity-100 motion-reduce:animate-none" : "opacity-0"}`} />
      <div className="w-full text-left">
        <h3 className="text-sm font-medium">{name}</h3>
        <p className="text-muted-foreground text-xs">{room}</p>
      </div>
      <div className="relative size-40" role="img" aria-label={i18n._({ id: "ui.Set to {target}{unit}, now {current}{unit}", message: "Set to {target}{unit}, now {current}{unit}", values: { target, current, unit } })}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-muted" strokeDasharray="198 66" transform="rotate(135 50 50)" />
        </svg>
        <span aria-hidden data-slot="climate-thumb" style={{ transform: `rotate(${angle}deg)` }} className="absolute inset-0 transition-transform duration-300 motion-reduce:transition-none">
          <span className={`absolute left-1/2 top-[3px] size-4 -translate-x-1/2 rounded-full border-2 border-card ${mode === "off" ? "bg-muted-foreground" : "bg-primary"}`} />
        </span>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums">{formatTileNumber(target, { unit })}</span>
          <span className="text-muted-foreground text-xs">{i18n._({ id: "ui.Now {current}{unit}", message: "Now {current}{unit}", values: { current, unit } })}</span>
        </div>
      </div>
      <p className="text-xs">
        {unavailable ? i18n._({ id: "ui.Last known: {state}", message: "Last known: {state}", values: { state: modeLabel.toLowerCase() } }) : modeLabel}
        {pending ? ` · ${i18n._({ id: "ui.Updating…", message: "Updating…" })}` : ""}
      </p>
      <div className="flex gap-2">
        <button type="button" aria-label={i18n._({ id: "ui.Lower {name}", message: "Lower {name}", values: { name } })} disabled={disabled || target <= min} onClick={() => nudge(-step)} className={`flex size-12 items-center justify-center rounded-full bg-muted ${PRESS} disabled:opacity-50`}><MinusIcon className="size-5" aria-hidden /></button>
        <button type="button" aria-label={i18n._({ id: "ui.Raise {name}", message: "Raise {name}", values: { name } })} disabled={disabled || target >= max} onClick={() => nudge(step)} className={`flex size-12 items-center justify-center rounded-full bg-muted ${PRESS} disabled:opacity-50`}><PlusIcon className="size-5" aria-hidden /></button>
      </div>
    </article>
  );
}
