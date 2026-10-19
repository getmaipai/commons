"use client";

import { useContext, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { PencilLineIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { ghostButton, mono, paper } from "./surfaces";
import { DraftRestoreRegionContext } from "./draft-restore-context";

export function DraftRestore({
  draft,
  savedAt,
  onRestore,
  onDiscard,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "draft" | "savedAt" | "onRestore" | "onDiscard"
> & {
  draft: string;
  savedAt: string;
  onRestore?: () => void;
  onDiscard?: () => void;
}) {
  const region = useContext(DraftRestoreRegionContext);
  const card = (
    <div
      data-slot="draft-restore"
      className={cn(
        paper,
        "fade-in slide-in-from-bottom-1 animate-in flex w-full max-w-none items-center gap-2 rounded-2xl px-2 py-1.5 duration-300",
        className,
      )}

      {...props}
    >
      <PencilLineIcon className="text-foreground/30 size-3.5 shrink-0" />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="text-foreground/70 min-w-0 flex-1 truncate whitespace-nowrap text-[13px]">{draft}</span>
        <span className={cn(mono, "text-muted-foreground shrink-0 whitespace-nowrap")}>
          unsent draft · {savedAt}
        </span>
      </div>
      <button
        type="button"
        onClick={onRestore}
        className="text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground/95 min-h-12 shrink-0 rounded-full px-3 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
      >
        Restore
      </button>
      <button
        type="button"
        aria-label="Discard the draft"
        onClick={onDiscard}
        className={cn(ghostButton, "size-12 shrink-0")}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
  return region ? createPortal(card, region) : card;
}
