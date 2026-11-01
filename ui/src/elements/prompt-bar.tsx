"use client";

import type { ReactNode } from "react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { TierSegment, type TierId, type TierOptionDef } from "./tier-segment";

export interface PromptBarOption {
  value: string | number;
  label: string;
}

export interface PromptBarChip {
  /** The key this chip's value is reported under. */
  id: string;
  /** The chip's accessible name (for example "Shape", "Length", "Camera move"). */
  label: string;
  options: readonly PromptBarOption[];
  value: string | number;
  onValueChange: (value: string | number) => void;
}

export interface PromptBarTier {
  value: TierId;
  onValueChange: (tier: TierId) => void;
  tiers?: readonly TierOptionDef[];
  label?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface PromptBarProps {
  /** Names the text box for assistive tech. */
  label: string;
  placeholder?: string;
  value: string;
  onValueChange: (text: string) => void;
  maxLength?: number;
  chips?: readonly PromptBarChip[];
  tier?: PromptBarTier;
  /** Words on the button. Default "Make". */
  submitLabel?: string;
  /** Called with Make or Cmd/Ctrl+Enter, only while the prompt is not empty and the bar is not disabled. */
  onSubmit: () => void;
  /** True while a request is out: Make stays off so one tap makes one job. */
  busy?: boolean;
  /** Set when the bar cannot be used right now (for example the engine is not ready); shown under the box instead of an error. */
  disabledReason?: string;
  /** Room for a picture picker later (Start frame), drawn at the start of the chip row. */
  leading?: ReactNode;
  /** Shown under the bar after a failed request. */
  error?: string | null;
  className?: string;
}

/** The prompt box of a make flow: a text box, chips that each choose one value, the Standard, Boost, Max segment and one Make button.
 * It holds no state of its own. Videos Create draws it through the `prompt_bar` schema node and the chat video card draws it directly. */
export function PromptBar({ label, placeholder, value, onValueChange, maxLength, chips = [], tier, submitLabel = "Make", onSubmit, busy = false, disabledReason, leading, error, className }: PromptBarProps) {
  const blocked = busy || Boolean(disabledReason);
  const ready = !blocked && value.trim() !== "";
  return (
    <form
      data-slot="prompt-bar"
      className={cn("flex w-full min-w-0 flex-col gap-3", className)}
      onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(); }}
    >
      <Textarea
        shape="rounded"
        maxRows={8}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={Boolean(disabledReason)}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (ready) onSubmit(); }
        }}
      />
      {leading || chips.length > 0 ? (
        <div data-slot="prompt-bar-chips" className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
          {leading}
          {chips.map((chip) => (
            <Select key={chip.id} value={String(chip.value)} disabled={Boolean(disabledReason)} onValueChange={(next) => {
              const picked = chip.options.find((o) => String(o.value) === next);
              if (picked) chip.onValueChange(picked.value);
            }}>
              <SelectTrigger data-chip={chip.id} aria-label={chip.label} shape="pill" className="min-h-[48px] shrink-0">
                <SelectValue placeholder={chip.label} />
              </SelectTrigger>
              <SelectContent>
                {chip.options.map((option) => (
                  <SelectItem key={String(option.value)} value={String(option.value)}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      ) : null}
      {tier ? <TierSegment {...tier} /> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!ready} className="min-h-[48px] px-6">{submitLabel}</Button>
      </div>
      {disabledReason ? <p role="status" data-slot="prompt-bar-note" className="text-sm text-muted-foreground">{disabledReason}</p> : null}
      {error ? <p role="status" data-slot="prompt-bar-error" className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
