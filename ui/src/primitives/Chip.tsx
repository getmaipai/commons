import { i18n } from "@/kit/i18n"
import type { ReactNode } from "react";
import { getIcon } from "@/kit/icons";
import { cn, FOCUS_RING_INSET } from "@/kit/utils";

const CheckIcon = getIcon("check");
const XIcon = getIcon("x");

interface ChipProps {
  children: ReactNode;
  /** A filter chip (Material 3's term, cited by docs/UI.md as the
   * reference for component behavior shadcn is silent on): togglable,
   * shows a check when selected. Mutually exclusive with `onRemove` -
   * nothing today needs a chip that is both a toggle and dismissible, and
   * a control that both selects on click and removes doesn't survive the
   * squint test for what the click actually does. */
  selected?: boolean;
  onClick?: () => void;
  /** An input chip: dismissible, no selected state of its own. */
  onRemove?: () => void;
  /** For a removable chip, the accessible name of the remove button (e.g.
   * "Remove Sage" rather than a bare "Remove" every chip in a row shares). */
  removeLabel?: string;
  /** `quiet` (PRO-LOOK-01): a text-only pill with a hairline ring and no fill; selected fills it lightly (no check mark). For scrolling suggestion and filter rows. */
  tone?: "outline" | "surface" | "quiet";
  selectedTone?: "tint" | "inverse";
  size?: "default" | "strip";
}

/** docs/UI.md names Material 3's chip as the pattern to follow where
 * shadcn/ui (the org's mandated kit base) has no component of its own -
 * this is that lift, not a hand-invented one. 48 px targets is the kit's
 * own floor (docs/UI.md > Responsive layout): the chip itself (`h-8` plus
 * its row's own gap) clears that for the select/toggle click, and the
 * remove button gets an invisible expanded hit area (Material 3's own
 * "visible icon stays small, touch target still meets the floor" pattern
 * for a dense chip) rather than growing the visible icon or the chip's
 * height to 48 px, which would blow out row height everywhere a chip is
 * used inline with text. */
export function Chip({ children, selected, onClick, onRemove, removeLabel, tone = "outline", selectedTone = "tint", size = "default" }: ChipProps) {
  const interactive = onClick !== undefined;
  return (
    <span
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      aria-pressed={interactive && selected !== undefined ? selected : undefined}
      className={cn(
        size === "strip" ? "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm transition-colors" : "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-base transition-colors",
        tone === "quiet"
          ? selected ? "border-transparent bg-foreground/10 text-foreground ring-1 ring-inset ring-[var(--hairline)]" : "border-transparent bg-transparent text-muted-foreground ring-1 ring-inset ring-[var(--hairline)]"
          : selected
          ? selectedTone === "inverse" ? "bg-foreground text-background" : "border-primary bg-primary/10 text-primary"
          : tone === "surface" ? "border-0 bg-[var(--surface-1)] text-muted-foreground" : "border-border bg-transparent text-foreground",
        interactive && ["cursor-pointer", tone === "quiet" ? "hover:text-foreground" : "hover:bg-accent", FOCUS_RING_INSET],
      )}
    >
      {selected && tone !== "quiet" ? <CheckIcon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel ?? i18n._({ id: "ui.Remove", message: "Remove" })}
          className={cn("relative -mr-1 flex h-4 w-4 items-center justify-center rounded-full", FOCUS_RING_INSET)}
        >
          <span className="absolute -inset-3" aria-hidden />
          <XIcon className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
