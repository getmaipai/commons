import { getIcon } from "@/kit/icons";
import { cn } from "@/kit/utils";
import { Switch } from "@/kit/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/kit/ui/tooltip";

export type SenseKind = "listening" | "speaking" | "vision";
export type SenseState = "active" | "idle" | "refused";

export interface SenseItem {
  kind: SenseKind;
  state: SenseState;
  /** The accessible name for this sense's current state, e.g. "Listening". */
  label: string;
}

export interface SensesDockProps {
  senses: SenseItem[];
  wakeWordLabel: string;
  wakeWordEnabled: boolean;
  onWakeWordChange: (enabled: boolean) => void;
  className?: string;
}

const SENSE_ICON = {
  listening: getIcon("mic"),
  speaking: getIcon("volume-2"),
  vision: getIcon("camera"),
};

// spec.md "The senses dock and the model picker": teal when active,
// secondary when idle, red when refused - status color without relying
// on hue alone (spec section 4), since each icon's own shape already
// carries the sense it represents, and `label` (rendered as the
// accessible name, not visible text) carries the state in words.
const SENSE_STATE_CLASS: Record<SenseState, string> = {
  active: "text-[var(--hue-teal)]",
  idle: "text-muted-foreground",
  refused: "text-[var(--hue-red)]",
};

/** One pill row above the composer (spec.md "The senses dock and the
 * model picker"), right-aligned, never covering the composer - a
 * caller places it, this component only renders what it's given. */
export function SensesDock({ senses, wakeWordLabel, wakeWordEnabled, onWakeWordChange, className }: SensesDockProps) {
  return (
    <div data-slot="senses-dock" className={cn("flex items-center justify-end gap-3", className)}>
      {senses.map((sense) => {
        const Icon = SENSE_ICON[sense.kind];
        return (
          // A native `title` alone never fires on touch, and the phone
          // layout collapses this dock to one icon a parent has to tap
          // to expand - the kit's own Tooltip (the same pattern
          // ThingsTable's StatusDot uses for an identical role="img"
          // status dot) gives the label a real, tap-reachable surface.
          <Tooltip key={sense.kind}>
            <TooltipTrigger asChild>
              <span role="img" aria-label={sense.label} className={cn("flex size-8 items-center justify-center", SENSE_STATE_CLASS[sense.state])}>
                <Icon className="size-5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent>{sense.label}</TooltipContent>
          </Tooltip>
        );
      })}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{wakeWordLabel}</span>
        <Switch checked={wakeWordEnabled} onCheckedChange={onWakeWordChange} aria-label={wakeWordLabel} />
      </label>
    </div>
  );
}
