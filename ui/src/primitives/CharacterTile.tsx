import type { ReactNode } from "react";
import { Avatar } from "@/kit/primitives/Avatar";
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
  variant?: "default" | "add";
}

export function CharacterTile({ name, seed, media, line, status, selected = false, menu, onSelect, variant = "default" }: CharacterTileProps) {
  const isAdd = variant === "add";
  const Check = icons.check;
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
