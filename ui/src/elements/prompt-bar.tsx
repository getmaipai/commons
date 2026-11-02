"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Film, Image as ImageIcon, Mic, Plus, SlidersHorizontal, Trash2, ArrowUp, X } from "lucide-react";
import { cn } from "cn";
import { FOCUS_RING_INSET } from "../utils";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useIsPhoneLayout } from "../hooks/useIsPhoneLayout";
import { useSplitViewLayout } from "../primitives/SplitView";
import { OptionCards, OptionThumb } from "./option-cards";
import { SafeImage } from "../primitives/SafeImage";
import { TierSegment, type TierId, type TierOptionDef } from "./tier-segment";

export interface PromptBarOption {
  value: string | number;
  label: string;
  /** Cards variant only: a resolved address of a short silent mp4 loop or an image. Absent: a plain tile. */
  media?: string;
}

/** VIDEO-CREATE-02: one file slot under the prompt box. VIDEO-UI-03 adds the `audio` and `video` kinds and the in-field placement. */
export interface PromptBarReference {
  /** The key the chosen file id is reported under. */
  id: string;
  label: string;
  kind: "picture" | "character" | "place" | "audio" | "video";
  /** `row` (default) draws a dashed square under the box. `in_field` draws the chosen file inside the prompt box as a named thumbnail
   * with a remove control, and the empty slot as a small add button in the box's foot. Only a picture, character or place. */
  placement?: "row" | "in_field";
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
  /** VIDEO-UI-03: `popover` shows the chip as one trigger that opens its options in a popover (a sheet on a phone). Default `inline`. */
  presentation?: "inline" | "popover";
  /** VIDEO-UI-03: the visible name of a shared popover trigger. Chips with the same group open one popover. */
  group?: string;
  /** VIDEO-UI-03: listed under the collapsed "More settings" control. */
  fold?: boolean;
}

export interface PromptBarTier {
  value: TierId;
  onValueChange: (tier: TierId) => void;
  tiers?: readonly TierOptionDef[];
  label?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface PromptBarSuggestion {
  label: string;
  /** Put in the box when the chip is pressed. */
  text: string;
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
  /** VIDEO-UI-03: `inline` (default) is a block in the page flow. `panel` is a control panel: inside a SplitView that is side by side
   * it is a pane that scrolls inside itself with the submit pinned at its foot, and inside one that is stacked it is a bottom dock
   * (the box, an Options button and a round submit) with the controls in a bottom sheet. The mode comes from the SplitView's layout
   * context; the bar runs no media query of its own. Outside a SplitView `panel` draws as `inline`. */
  placement?: "inline" | "panel";
  /** VIDEO-UI-03: up to 4 idea chips shown while the box is empty. */
  suggestions?: readonly PromptBarSuggestion[];
  /** VIDEO-UI-03: the small line under the submit button (a time, never credits). */
  submitDetail?: string;
  /** VIDEO-UI-03: words on the dock's button and the sheet's title. Default "Options". */
  optionsLabel?: string;
  /** VIDEO-UI-03: words on the fold. Default "More settings". */
  foldLabel?: string;
}

type Mode = "inline" | "panel" | "dock";

function chosenLabel(chip: PromptBarChip): string {
  return chip.options.find((o) => String(o.value) === String(chip.value))?.label ?? "";
}

/** The prompt box of a make flow: a text box, chips that each choose one value, the Standard, Boost, Max segment and one Make button.
 * It holds no state of its own. Videos Create draws it through the `prompt_bar` schema node and the chat video card draws it directly. */
export function PromptBar({ label, placeholder, value, onValueChange, maxLength, chips = [], references = [], tier, submitLabel = "Make", onSubmit, busy = false, disabledReason, leading, error, className, placement = "inline", suggestions = [], submitDetail, optionsLabel = "Options", foldLabel = "More settings" }: PromptBarProps) {
  const layout = useSplitViewLayout();
  const phone = useIsPhoneLayout();
  const mode: Mode = placement === "panel" && layout ? (layout === "side" ? "panel" : "dock") : "inline";
  const [sheetOpen, setSheetOpen] = useState(false);
  const field = useRef<HTMLTextAreaElement | null>(null);
  const detailId = useId();
  const blocked = busy || Boolean(disabledReason);
  const empty = value.trim() === "";
  const ready = !blocked && !empty;
  const locked = Boolean(disabledReason);
  const inField = references.find((r) => r.placement === "in_field" && r.kind !== "audio" && r.kind !== "video");
  const rowRefs = references.filter((r) => r !== inField);
  const unfolded = chips.filter((c) => !c.fold);
  const folded = chips.filter((c) => c.fold);
  const shown = suggestions.slice(0, 4);

  function trySubmit() { if (ready) onSubmit(); }

  const notes = (
    <>
      {disabledReason ? <p role="status" data-slot="prompt-bar-note" className="text-sm text-muted-foreground">{disabledReason}</p> : null}
      {error ? <p role="status" data-slot="prompt-bar-error" className="text-sm text-destructive">{error}</p> : null}
    </>
  );

  const textbox = (rows: number, extra?: string) => {
    const bare = mode !== "inline" || Boolean(inField);
    return (
      <Textarea
        ref={field}
        shape="rounded"
        maxRows={rows}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={locked}
        className={cn(bare && "rounded-2xl border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent dark:disabled:bg-transparent", extra)}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); trySubmit(); }
        }}
      />
    );
  };

  const suggestionRow = shown.length > 0 && empty && !locked ? (
    <div role="group" aria-label="Ideas" data-slot="prompt-bar-suggestions" className={cn("flex min-w-0 gap-2", mode === "dock" ? "flex-nowrap overflow-x-auto" : "flex-wrap")}>
      {shown.map((s) => (
        <Button key={s.label} type="button" variant="outline" shape="pill" size="sm" className="shrink-0" onClick={() => { onValueChange(s.text); field.current?.focus(); }}>{s.label}</Button>
      ))}
    </div>
  ) : null;

  const fieldBox = (rows: number, dock: boolean) => {
    if (mode === "inline" && !inField) return textbox(rows);
    const filled = Boolean(inField?.value);
    return (
      <div data-slot="prompt-bar-field" className="flex min-w-0 flex-1 flex-col rounded-2xl border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
        {inField && filled ? <InFieldThumb reference={inField} locked={locked} compact={dock} /> : null}
        {textbox(rows, dock ? "min-h-12 resize-none py-3" : undefined)}
        {inField && !filled && !dock ? (
          <div className="flex px-2 pb-2">
            <button type="button" aria-label={`Add ${inField.label}`} disabled={locked || inField.disabled} onClick={inField.onPick} className="flex min-h-12 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
              <ImageIcon className="size-4" aria-hidden="true" />
              <span>{inField.label}</span>
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const refsRow = (list: readonly PromptBarReference[]) => list.length > 0 ? (
    <div data-slot="prompt-bar-references" className="flex min-w-0 flex-wrap items-start gap-3">
      {list.map((ref) => <ReferenceSlot key={ref.id} reference={ref} locked={locked} />)}
    </div>
  ) : null;

  const dropdown = (chip: PromptBarChip) => (
    <Select key={chip.id} value={String(chip.value)} disabled={locked} onValueChange={(next) => {
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
  );

  const cardsSection = (chip: PromptBarChip, columns: "auto" | "three" = "auto") => (
    <div key={chip.id} data-slot="prompt-bar-cards" className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{chip.label}</span>
      <OptionCards chipId={chip.id} label={chip.label} options={chip.options} value={chip.value} disabled={locked} columns={columns} onValueChange={chip.onValueChange} />
    </div>
  );

  /** Chips drawn flat: cards as sections, dropdowns in a row. Used where there is room for everything (the sheet) and for folded chips. */
  const flatChips = (list: readonly PromptBarChip[], columns: "auto" | "three") => {
    const dropdowns = list.filter((c) => c.variant !== "cards");
    return (
      <>
        {list.filter((c) => c.variant === "cards").map((c) => cardsSection(c, columns))}
        {dropdowns.length > 0 ? <div data-slot="prompt-bar-chips" className="flex min-w-0 flex-wrap items-center gap-2">{dropdowns.map(dropdown)}</div> : null}
      </>
    );
  };

  /** Groups of popover chips, in the order of their first member. A popover chip with no group is its own group. */
  const groupsOf = (list: readonly PromptBarChip[]) => {
    const groups: { name: string; chips: PromptBarChip[] }[] = [];
    for (const chip of list.filter((c) => c.presentation === "popover")) {
      const name = chip.group ?? chip.label;
      const found = groups.find((g) => g.name === name);
      if (found) found.chips.push(chip); else groups.push({ name, chips: [chip] });
    }
    return groups;
  };

  const fold = folded.length > 0 ? (
    <Collapsible data-slot="prompt-bar-fold" className="flex min-w-0 flex-col">
      <CollapsibleTrigger asChild>
        <button type="button" className={cn("group flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-1 text-left text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50")}>
          <span>{foldLabel}</span>
          <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex min-w-0 flex-col gap-4 pt-2">
        {flatChips(folded, mode === "dock" ? "three" : "auto")}
      </CollapsibleContent>
    </Collapsible>
  ) : null;

  const tierSegment = tier ? <TierSegment {...tier} /> : null;

  const submitButton = (sheet: boolean) => (
    <Button
      type={sheet ? "button" : "submit"}
      size="lg"
      width="full"
      disabled={!ready}
      aria-describedby={submitDetail ? detailId : undefined}
      onClick={sheet ? () => { if (ready) { setSheetOpen(false); onSubmit(); } } : undefined}
    >{submitLabel}</Button>
  );
  const detailLine = submitDetail ? <p id={detailId} data-slot="prompt-bar-detail" className="text-center text-sm text-muted-foreground">{submitDetail}</p> : null;

  // ---- inline: the original block, in its original order ----
  if (mode === "inline") {
    const groups = groupsOf(unfolded);
    const plainChips = unfolded.filter((c) => c.presentation !== "popover");
    return (
      <form
        data-slot="prompt-bar"
        className={cn("flex w-full min-w-0 flex-col gap-3", className)}
        onSubmit={(e) => { e.preventDefault(); trySubmit(); }}
      >
        {fieldBox(8, false)}
        {suggestionRow}
        {refsRow(rowRefs)}
        {plainChips.filter((c) => c.variant === "cards").map((c) => cardsSection(c))}
        {leading || groups.length > 0 || plainChips.some((c) => c.variant !== "cards") ? (
          <div data-slot="prompt-bar-chips" className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
            {leading}
            {groups.map((g) => <StyleGroup key={g.name} name={g.name} chips={g.chips} locked={locked} sheet={phone} side="bottom" dropdown={dropdown} cards={(c) => <OptionCards chipId={c.id} label={c.label} options={c.options} value={c.value} disabled={locked} onValueChange={c.onValueChange} />} />)}
            {plainChips.filter((c) => c.variant !== "cards").map(dropdown)}
          </div>
        ) : null}
        {tierSegment}
        {fold}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!ready} className="min-h-[48px] px-6" aria-describedby={submitDetail ? detailId : undefined}>{submitLabel}</Button>
        </div>
        {detailLine}
        {notes}
      </form>
    );
  }

  // ---- panel: a pane that scrolls inside itself, the submit pinned at its foot ----
  if (mode === "panel") {
    const groups = groupsOf(unfolded);
    const seen = new Set<string>();
    // Cards and popover groups in authored order; dropdown chips follow the tier.
    const ordered: ReactNode[] = [];
    for (const chip of unfolded) {
      if (chip.presentation === "popover") {
        const name = chip.group ?? chip.label;
        if (seen.has(name)) continue;
        seen.add(name);
        const g = groups.find((x) => x.name === name)!;
        ordered.push(<StyleGroup key={`g-${name}`} name={name} chips={g.chips} locked={locked} sheet={false} side="right" block dropdown={dropdown} cards={(c) => <OptionCards chipId={c.id} label={c.label} options={c.options} value={c.value} disabled={locked} onValueChange={c.onValueChange} />} />);
      } else if (chip.variant === "cards") ordered.push(cardsSection(chip));
    }
    const dropdowns = unfolded.filter((c) => c.presentation !== "popover" && c.variant !== "cards");
    return (
      <form
        data-slot="prompt-bar"
        data-placement="panel"
        data-mode="panel"
        className={cn("flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground lg:sticky lg:top-4 lg:max-h-[calc(100dvh-var(--prompt-panel-offset))]", className)}
        onSubmit={(e) => { e.preventDefault(); trySubmit(); }}
      >
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a keyboard-scrollable region, not a widget (DetailPane's own precedent). */}
        <div data-slot="prompt-bar-body" tabIndex={0} aria-label={optionsLabel} role="group" className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4", FOCUS_RING_INSET)}>
          {fieldBox(10, false)}
          {suggestionRow}
          {refsRow(rowRefs)}
          {ordered}
          {tierSegment}
          {leading || dropdowns.length > 0 ? (
            <div data-slot="prompt-bar-chips" className="flex min-w-0 flex-wrap items-center gap-2">
              {leading}
              {dropdowns.map(dropdown)}
            </div>
          ) : null}
          {fold}
        </div>
        <div data-slot="prompt-bar-foot" className="flex shrink-0 flex-col gap-2 border-t border-border p-4">
          {submitButton(false)}
          {detailLine}
          {notes}
        </div>
      </form>
    );
  }

  // ---- dock: the box, Options and a round submit; everything else in a bottom sheet ----
  return (
    <>
      <div aria-hidden="true" data-slot="prompt-bar-dock-spacer" className="h-28 shrink-0" />
      <form
        data-slot="prompt-bar"
        data-placement="panel"
        data-mode="dock"
        className={cn("fixed inset-x-0 bottom-0 z-30 flex min-w-0 flex-col gap-2 border-t border-border bg-background px-3 pt-3", className)}
        onSubmit={(e) => { e.preventDefault(); trySubmit(); }}
      >
        {suggestionRow}
        {disabledReason || error ? <div className="flex flex-col gap-1">{notes}</div> : null}
        <div className="flex min-w-0 items-end gap-2">
          {fieldBox(4, true)}
          <Button type="button" variant="outline" size="icon" shape="pill" aria-label={optionsLabel} aria-haspopup="dialog" aria-expanded={sheetOpen} disabled={locked} onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </Button>
          <Button type="submit" size="icon" shape="pill" aria-label={submitLabel} disabled={!ready}>
            <ArrowUp className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </form>
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent aria-describedby={undefined}>
          <DrawerHeader><DrawerTitle>{optionsLabel}</DrawerTitle></DrawerHeader>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a keyboard-scrollable region, not a widget. */}
          <div data-slot="prompt-bar-sheet-body" tabIndex={0} role="group" aria-label={optionsLabel} className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4", FOCUS_RING_INSET)}>
            {refsRow([...(inField && !inField.value ? [inField] : []), ...rowRefs])}
            {flatChips(unfolded.filter((c) => c.variant === "cards"), "three")}
            {tierSegment}
            {flatChips(unfolded.filter((c) => c.variant !== "cards"), "three")}
            {fold}
          </div>
          <DrawerFooter className="border-t border-border">
            {submitButton(true)}
            {detailLine}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function KindIcon({ kind, className }: { kind: PromptBarReference["kind"]; className?: string }) {
  if (kind === "audio") return <Mic className={className} aria-hidden="true" />;
  if (kind === "video") return <Film className={className} aria-hidden="true" />;
  return <ImageIcon className={className} aria-hidden="true" />;
}

/** One dashed slot of the reference row, or its filled thumbnail with a remove control. */
function ReferenceSlot({ reference: ref, locked }: { reference: PromptBarReference; locked: boolean }) {
  return (
    <div data-reference={ref.id} className="relative">
      {ref.value ? (
        <>
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {ref.thumb ? <SafeImage src={ref.thumb} alt={ref.label} className="size-full object-cover" /> : <span className="px-1 text-center text-xs text-muted-foreground">{ref.label}</span>}
          </div>
          <button type="button" aria-label={`Remove ${ref.label}`} disabled={locked} onClick={ref.onRemove} className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border bg-background text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </>
      ) : (
        <button type="button" aria-label={`Add ${ref.label}`} disabled={locked || ref.disabled} onClick={ref.onPick} className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground outline-none transition-colors hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
          {ref.kind === "audio" || ref.kind === "video" ? <KindIcon kind={ref.kind} className="size-5" /> : <Plus className="size-5" aria-hidden="true" />}
          <span className="max-w-full truncate px-1 text-xs">{ref.label}</span>
        </button>
      )}
    </div>
  );
}

/** The chosen in-field reference: a named thumbnail inside the prompt box with a trash control (reference 8). */
function InFieldThumb({ reference: ref, locked, compact }: { reference: PromptBarReference; locked: boolean; compact: boolean }) {
  return (
    <div data-slot="prompt-bar-infield" data-reference={ref.id} className={cn("flex min-w-0 items-center px-3", compact ? "pt-2" : "pt-3")}>
      <span className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/50 p-1 pr-1">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {ref.thumb ? <SafeImage src={ref.thumb} alt={ref.label} className="size-full object-cover" /> : <KindIcon kind={ref.kind} className="size-4 text-muted-foreground" />}
        </span>
        <span className="min-w-0 max-w-40 truncate text-sm">{ref.label}</span>
        <button type="button" aria-label={`Remove ${ref.label}`} disabled={locked} onClick={ref.onRemove} className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

/** One trigger for several chips (Look, Camera, Sound): two small thumbnails and the chosen words, opening one popover, or a sheet
 * on a phone. A text chip may be in the group. */
function StyleGroup({ name, chips, locked, sheet, side, block, dropdown, cards }: {
  name: string;
  chips: readonly PromptBarChip[];
  locked: boolean;
  sheet: boolean;
  side: "right" | "bottom";
  block?: boolean;
  dropdown: (chip: PromptBarChip) => ReactNode;
  cards: (chip: PromptBarChip) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const thumbs = chips.filter((c) => c.variant === "cards").map((c) => c.options.find((o) => String(o.value) === String(c.value))?.media).filter((m): m is string => Boolean(m)).slice(0, 2);
  const summary = chips.map(chosenLabel).filter(Boolean).join(", ");
  const trigger = (
    <button
      type="button"
      data-slot="prompt-bar-group"
      data-group={name}
      disabled={locked}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={sheet ? () => setOpen(true) : undefined}
      className={cn("flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-input bg-transparent p-2 pr-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50", block ? "w-full" : "shrink-0")}
    >
      {thumbs.length > 0 ? (
        <span className="flex shrink-0 gap-1">
          {thumbs.map((src, i) => <span key={i} className="size-10 overflow-hidden rounded-lg bg-muted"><OptionThumb src={src} /></span>)}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-medium text-muted-foreground">{name}</span>
        <span className="truncate text-sm">{summary}</span>
      </span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
  const body = (
    <div data-slot="prompt-bar-group-body" className="flex min-w-0 flex-col gap-4">
      {chips.map((chip) => chip.variant === "cards" ? (
        <div key={chip.id} data-slot="prompt-bar-cards" className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">{chip.label}</span>
          {cards(chip)}
        </div>
      ) : <div key={chip.id} className="flex min-w-0 flex-wrap gap-2">{dropdown(chip)}</div>)}
      <Button type="button" variant="outline" width="full" onClick={() => setOpen(false)}>Done</Button>
    </div>
  );
  if (sheet) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent aria-describedby={undefined}>
            <DrawerHeader><DrawerTitle>{name}</DrawerTitle></DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{body}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent width="auto" side={side} align="start" aria-label={name} className="max-h-[min(70dvh,36rem)] w-[min(92vw,32rem)] overflow-y-auto">
        {body}
      </PopoverContent>
    </Popover>
  );
}
