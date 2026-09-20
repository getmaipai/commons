import { useState } from "react";
import { getIcon } from "@/kit/icons";
import { cn, hitArea } from "@/kit/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/kit/ui/popover";

export type MemoryChipKind = "remembered" | "recalled" | "failed";

export interface MemoryChipProps {
  kind: MemoryChipKind;
  /** Required for "remembered"/"recalled" (the popover's own rows);
   * ignored for "failed", which has nothing to keep, edit, or forget. */
  onKeep?: () => void;
  onEdit?: () => void;
  onForget?: () => void;
  /** Required for "failed" - the chip's own click goes straight to
   * wherever a person can see what happened, no popover in between
   * (there's no action to offer on a memory that was never saved). */
  onOpenMemory?: () => void;
  className?: string;
}

const LABEL: Record<MemoryChipKind, string> = {
  remembered: "Remembered",
  recalled: "From memory",
  failed: "Memory wasn't saved",
};

const BrainIcon = getIcon("brain");
const CheckIcon = getIcon("check");
const PencilIcon = getIcon("pencil");
const TrashIcon = getIcon("trash");

const CHIP_CLASS = cn("inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium", hitArea(3));

/** One chip at the end of a reply that wrote or used a memory (spec.md
 * "Inside a turn"), violet accent. Tap opens the memory actions in a
 * popover, never a modal. A save that failed is a different shape (spec
 * section 4's state table: a red label plus a recovery action, not a
 * set of actions on something that doesn't exist) - it renders as a
 * plain button in the destructive tint, going straight to `onOpenMemory`
 * with no popover. */
export function MemoryChip({ kind, onKeep, onEdit, onForget, onOpenMemory, className }: MemoryChipProps) {
  const [open, setOpen] = useState(false);

  if (kind === "failed") {
    return (
      <button
        type="button"
        data-slot="chat-memory-chip"
        data-variant="failed"
        onClick={onOpenMemory}
        className={cn(CHIP_CLASS, "bg-destructive/10 text-destructive hover:bg-destructive/15", className)}
      >
        <BrainIcon className="size-3" aria-hidden />
        {LABEL.failed}
      </button>
    );
  }

  function runAndClose(action: (() => void) | undefined): void {
    action?.();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="chat-memory-chip"
          data-variant={kind}
          className={cn(CHIP_CLASS, "bg-[var(--hue-violet)]/10 text-[var(--hue-violet)] hover:bg-[var(--hue-violet)]/15", className)}
        >
          <BrainIcon className="size-3" aria-hidden />
          {LABEL[kind]}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <button type="button" onClick={() => runAndClose(onKeep)} className="flex min-h-12 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-accent">
          <CheckIcon className="size-4 text-muted-foreground" aria-hidden />
          Keep
        </button>
        <button type="button" onClick={() => runAndClose(onEdit)} className="flex min-h-12 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-accent">
          <PencilIcon className="size-4 text-muted-foreground" aria-hidden />
          Edit
        </button>
        <button type="button" onClick={() => runAndClose(onForget)} className="flex min-h-12 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-destructive hover:bg-accent">
          <TrashIcon className="size-4" aria-hidden />
          Forget
        </button>
      </PopoverContent>
    </Popover>
  );
}
