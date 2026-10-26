"use client";

import type { ComponentProps } from "react";
import { CheckIcon, Clock3Icon, LightbulbIcon, ListChecksIcon, LockKeyholeIcon, Music2Icon } from "lucide-react";
import { cn } from "cn";
import { paper, pressable } from "./surfaces";

const icons = { check: CheckIcon, clock: Clock3Icon, lightbulb: LightbulbIcon, lock: LockKeyholeIcon, music: Music2Icon, list: ListChecksIcon };
export function Confirmation({ icon, sentence, undo, onUndo, className, ...props }: Omit<ComponentProps<"div">, "children"> & { icon: keyof typeof icons; sentence: string; undo?: { label: "Undo"; action: "undo" }; onUndo?: () => void }) {
  const Icon = icons[icon];
  return <div data-slot="confirmation" className={cn(paper, "flex w-full max-w-sm items-center gap-3 rounded-2xl p-4", className)} {...props}>
    <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full"><Icon aria-hidden="true" className="size-4" /></span>
    <p className="min-w-0 flex-1 text-[13px]">{sentence}</p>
    {undo ? <button type="button" disabled={!onUndo} onClick={onUndo} className={cn("text-primary rounded-lg px-3 py-2 text-xs font-medium focus-visible:ring-ring outline-none focus-visible:ring-2 disabled:cursor-default", pressable)}>{undo.label}</button> : null}
  </div>;
}
