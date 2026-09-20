import { useState } from "react";
import { getIcon } from "@/kit/icons";
import { cn, hitArea } from "@/kit/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/kit/ui/popover";

export type MemoryChipKind = "remembered" | "recalled";

export interface MemoryChipProps {
  kind: MemoryChipKind;
  onKeep: () => void;
  onEdit: () => void;
  onForget: () => void;
  className?: string;
}

const LABEL: Record<MemoryChipKind, string> = {
  remembered: "Remembered",
  recalled: "From memory",
};

const BrainIcon = getIcon("brain");
const CheckIcon = getIcon("check");
const PencilIcon = getIcon("pencil");
const TrashIcon = getIcon("trash");

/** One chip at the end of a reply that wrote or used a memory (spec.md
 * "Inside a turn"), violet accent. Tap opens the memory actions in a
 * popover, never a modal. */
export function MemoryChip({ kind, onKeep, onEdit, onForget, className }: MemoryChipProps) {
  const [open, setOpen] = useState(false);

  function runAndClose(action: () => void): void {
    action();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="chat-memory-chip"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-transparent bg-[var(--hue-violet)]/10 px-2 py-0.5 text-xs font-medium text-[var(--hue-violet)] hover:bg-[var(--hue-violet)]/15",
            hitArea(3),
            className,
          )}
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
