"use client";

import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { OptionCards } from "./option-cards";
import { SafeImage } from "../primitives/SafeImage";
import { TierSegment, type TierId, type TierOptionDef } from "./tier-segment";

export interface PromptBarOption {
  value: string | number;
  label: string;
  /** Cards variant only: a resolved address of a short silent mp4 loop or an image. Absent: a plain tile. */
  media?: string;
}

/** VIDEO-CREATE-02: one picture slot under the prompt box. */
export interface PromptBarReference {
  /** The key the chosen file id is reported under. */
  id: string;
  label: string;
  kind: "picture" | "character" | "place";
  /** The chosen file id; empty or absent while the slot is empty. */
  value?: string | null;
  /** A resolved address for the thumbnail of a filled slot. */
  thumb?: string;
  /** Called when an empty slot is clicked: the host opens its media picker and sets the value. */
  onPick: () => void;
  /** True when the host has no media picker, so an empty slot cannot be filled. */
  disabled?: boolean;
  onRemove: () => void;
}

export interface PromptBarChip {
  /** The key this chip's value is reported under. */
  id: string;
  /** The chip's accessible name (for example "Shape", "Length", "Camera move"). */
  label: string;
  options: readonly PromptBarOption[];
  /** `cards` draws the options as a grid of picture cards (one choice) instead of a dropdown. Default `dropdown`. */
  variant?: "dropdown" | "cards";
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
  /** Dashed square slots under the prompt box. */
  references?: readonly PromptBarReference[];
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
export function PromptBar({ label, placeholder, value, onValueChange, maxLength, chips = [], references = [], tier, submitLabel = "Make", onSubmit, busy = false, disabledReason, leading, error, className }: PromptBarProps) {
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
      {references.length > 0 ? (
        <div data-slot="prompt-bar-references" className="flex min-w-0 flex-wrap items-start gap-3">
          {references.map((ref) => (
            <div key={ref.id} data-reference={ref.id} className="relative">
              {ref.value ? (
                <>
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {ref.thumb ? <SafeImage src={ref.thumb} alt={ref.label} className="size-full object-cover" /> : <span className="px-1 text-center text-xs text-muted-foreground">{ref.label}</span>}
                  </div>
                  <button type="button" aria-label={`Remove ${ref.label}`} disabled={Boolean(disabledReason)} onClick={ref.onRemove} className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border bg-background text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <button type="button" aria-label={`Add ${ref.label}`} disabled={Boolean(disabledReason) || ref.disabled} onClick={ref.onPick} className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground outline-none transition-colors hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
                  <Plus className="size-5" aria-hidden="true" />
                  <span className="max-w-full truncate px-1 text-xs">{ref.label}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {chips.filter((c) => c.variant === "cards").map((chip) => (
        <div key={chip.id} data-slot="prompt-bar-cards" className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">{chip.label}</span>
          <OptionCards chipId={chip.id} label={chip.label} options={chip.options} value={chip.value} disabled={Boolean(disabledReason)} onValueChange={chip.onValueChange} />
        </div>
      ))}
      {leading || chips.some((c) => c.variant !== "cards") ? (
        <div data-slot="prompt-bar-chips" className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
          {leading}
          {chips.filter((c) => c.variant !== "cards").map((chip) => (
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
