import { cn, hueTextColor, hueTintBackground } from "@/kit/utils";

export interface TypeBadgeProps {
  label: string;
  /** A `--hue-*` CSS var name, e.g. `"--hue-blue"`. */
  hue: string;
  className?: string;
}

// Spec section 1 ("Pills and badges"): "the same shape [as a status
// pill] without the dot, tinted with the kind's accent (LLM, Runtime,
// Image App and so on in the reference; App, Plugin, Person, Memory,
// Engine in Home)." Shares StatusPill's 15%-tint-plus-hueTextColor
// styling (and its contrast fix: a raw hue text on this exact
// background fails 4.5:1 for every named hue in light theme).
export function TypeBadge({ label, hue, className }: TypeBadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={{ backgroundColor: hueTintBackground(hue), color: hueTextColor(hue) }}
    >
      {label}
    </span>
  );
}
