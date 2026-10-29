import type { ReactNode } from "react";
import { Avatar } from "@/kit/primitives/Avatar";
import { Checkbox } from "@/kit/ui/checkbox";
import { icons } from "@/kit/icons";
import { cn } from "@/kit/utils";

export interface CharacterTileProps {
  name: string;
  seed?: string | null;
  media?: ReactNode;
  line?: ReactNode;
  status?: ReactNode;
  selected?: boolean;
  menu?: ReactNode;
  onSelect?: () => void;
  /**
   * "default" is the round portrait with a name pill; "add" is the dashed add tile. KIT-3S-01 adds two picture
   * tiles for the companion flow: "picture" (a style choice: the picture above its label, the chosen one framed
   * with a bold label) and "animation" (a square still with a label, a lock when `locked`, and a checkbox when
   * `onCheckedChange` is set).
   */
  variant?: "default" | "add" | "picture" | "animation";
  /** Animation tile: a required item that cannot be unchecked; draws a lock. */
  locked?: boolean;
  /** Animation tile: the checkbox state. */
  checked?: boolean;
  /** Animation tile: set to draw a checkbox the person can tick. */
  onCheckedChange?: (checked: boolean) => void;
  /** Accessible name of the checkbox. Default "Select <name>". */
  checkLabel?: string;
  /** Accessible name of the lock. Default "Required". */
  lockLabel?: string;
}

export function CharacterTile({ name, seed, media, line, status, selected = false, menu, onSelect, variant = "default", locked = false, checked = false, onCheckedChange, checkLabel, lockLabel = "Required" }: CharacterTileProps) {
  const isAdd = variant === "add";
  const Check = icons.check;
  if (variant === "picture" || variant === "animation") {
    const Lock = icons.lock;
    const picture = variant === "picture";
    return (
      <div data-slot="character-tile" data-variant={variant} data-selected={selected ? "true" : undefined} className="relative flex min-w-0 flex-col">
        <button type="button" aria-label={name} aria-pressed={selected} onClick={onSelect}
          className={cn("group flex min-w-0 flex-col gap-2 rounded-2xl border bg-card p-2 text-card-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
            selected ? "border-2 border-foreground" : "border-border")}>
          <span className={cn("relative flex w-full items-center justify-center overflow-hidden bg-muted", picture ? "aspect-[4/3] rounded-xl" : "aspect-square rounded-xl")}>
            {media ?? <Avatar name={name} seed={seed} className="size-full" />}
          </span>
          <span className={cn("truncate text-center text-sm", selected ? "font-bold" : "font-medium")}>{name}</span>
        </button>
        {locked ? <span role="img" aria-label={lockLabel} className="pointer-events-none absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground"><Lock className="size-3.5" aria-hidden="true" /></span> : null}
        {!locked && onCheckedChange ? <span className="absolute left-3 top-3 flex size-6 items-center justify-center rounded-md bg-background/80">
          <Checkbox aria-label={checkLabel ?? `Select ${name}`} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
        </span> : null}
        {line ? <div className="mt-1 text-center text-sm text-muted-foreground">{line}</div> : null}
        {status ? <div className="text-center">{status}</div> : null}
      </div>
    );
  }
  return (
    <div className="relative flex flex-col items-center gap-2">
      <button type="button" aria-label={name} aria-pressed={selected} onClick={onSelect}
        className={cn("group relative flex flex-col items-center gap-2 rounded-xl p-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", isAdd && "border border-dashed border-border")}>
        <span className={cn("relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-muted", isAdd && "bg-card")}>
          {isAdd ? <span aria-hidden="true" className="text-3xl text-muted-foreground">+</span> : media ?? <Avatar name={name} seed={seed} className="size-full" />}
          {selected && !isAdd ? <span aria-hidden="true" className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-card text-foreground"><Check className="size-4" /></span> : null}
        </span>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">{name}</span>
      </button>
      {menu ? <div className="absolute right-2 top-2">{menu}</div> : null}
      {line ? <div className="text-sm text-muted-foreground">{line}</div> : null}
      {status ? <div>{status}</div> : null}
    </div>
  );
}
