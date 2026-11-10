"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Film, Image as ImageIcon, Mic, Plus, SlidersHorizontal, Trash2, ArrowUp, X, CircleAlert } from "lucide-react";
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
import { OptionCards, OptionThumb, isLockedOption, type LockedOptionCard } from "./option-cards";
import { SafeImage } from "../primitives/SafeImage";
import { TierSegment, type TierId, type TierOptionDef } from "./tier-segment";
import { i18n } from "@/kit/i18n"
import { getIcon } from "../icons";

export interface PromptBarOption {
  value: string | number;
  label: string;
  /** Cards variant only: a resolved address of a short silent mp4 loop or an image. Absent: a plain tile. */
  media?: string;
  /** VIDEO-LORA-09: one plain line shown under the chip's cards while this option is chosen. */
  note?: string;
  /** VIDEO-COMPOSER-03: an optional compact icon in dropdown choices, resolved from the kit's Lucide icon set. */
  icon?: string;
}

/** VIDEO-CREATE-02: one file slot under the prompt box. VIDEO-UI-03 adds the `audio` and `video` kinds and the in-field placement. */
export interface PromptBarReference {
  /** The key the chosen file id is reported under. */
  id: string;
  label: string;
  kind: "picture" | "character" | "place" | "audio" | "video";
  /** `row` (default) draws a dashed square under the box. `in_field` draws the chosen file inside the prompt box as a named thumbnail
   * with a remove control, and the empty slot as a small add button in the box's foot. Only a picture, character or place. */
  placement?: "row" | "in_field" | "tile";
  /** VIDEO-UI-12: `tile` draws the empty slot as a full-width dashed tile in the box (an icon, the label and `hint`), and the chosen file
   * as the named thumbnail with a remove control, as `in_field` does. Only a picture, character or place; shares the one in-field place
   * with `in_field`. */
  hint?: string;
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
  /** ADULT-LOCK-01: a `{ locked: true, making? }` entry (cards variant) is one lock tile for every locked choice; it has no value or label and is never a choice or shown in a dropdown. */
  options: readonly (PromptBarOption | LockedOptionCard)[];
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
  /** VIDEO-UI-13: on a popover group, `banner` draws the shared trigger as a poster banner. Read from the first chip of the group that sets it. Default `default`. */
  trigger?: "default" | "banner";
  /** VIDEO-UI-13: on a popover group, `wide` opens a wider popover with six cards a row. Read from the first chip of the group that sets it. Default `default`. */
  popoverSize?: "default" | "wide";
  /** VIDEO-LORA-09: while set, the chip is drawn disabled and this plain line is shown under its cards instead of a choice's note (the host sets it when the chip cannot be used at the chosen level). */
  disabledReason?: string;
  /** VIDEO-LORA-09: while this value is chosen the chip adds nothing to its group's summary words and thumbnails (a "No style" or "Normal" default). */
  quietValue?: string | number;
  /** VIDEO-COMPOSER-03: put this compact control on the trailing side of the chat toolbar. */
  align?: "start" | "end";
  /** VIDEO-COMPOSER-03: keep the selected icon visible and the selected words in the accessible name/menu only. */
  iconOnly?: boolean;
}

export interface PromptBarTier {
  value: TierId;
  onValueChange: (tier: TierId) => void;
  tiers?: readonly TierOptionDef[];
  label?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** VIDEO-UI-12: `segment` (default) or `cards`. */
  presentation?: "segment" | "cards" | "dropdown";
  /** VIDEO-UI-12: cards only: the time words for each level, by id. */
  details?: Readonly<Record<string, string>>;
}

export interface PromptBarSuggestion {
  label: string;
  /** Put in the box when the chip is pressed. */
  text: string;
}

export interface PromptBarModeSelector {
  label: string;
  value: string;
  options: readonly PromptBarOption[];
  onValueChange: (value: string) => void;
}

/** STYLES-04: one suggested style or character shown as a removable chip under the prompt box. */
export interface PromptBarSuggestedStyle {
  id: string;
  name: string;
  kind: "style" | "character";
}

export interface PromptBarProps {
  /** Names the text box for assistive tech. */
  label: string;
  placeholder?: string;
  value: string;
  onValueChange: (text: string) => void;
  maxLength?: number;
  chips?: readonly PromptBarChip[];
  /** VIDEO-COMPOSER-03: the media kind selector built into the same Chat-style composer toolbar. */
  modeSelector?: PromptBarModeSelector;
  /** Dashed square slots under the prompt box. */
  references?: readonly PromptBarReference[];
  tier?: PromptBarTier;
  /** VIDEO-UI-12: the prompt box's height. `default` is unchanged; `large` is about 140 px (five rows) in the panel and the inline bar;
   * the phone dock keeps its compact box. */
  fieldSize?: "default" | "large";
  /** VIDEO-UI-12: where `submitDetail` is drawn. `below` (default) is the line under the button; `in_button` is the second line inside it
   * (a 64 px button). */
  submitDetailPlacement?: "below" | "in_button";
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
  /** VIDEO-COMPOSER-02: `chat` adapts the compact Chat composer interaction for a make prompt and its inline choices. `composer` is the earlier grouped layout. */
  layout?: "block" | "composer" | "chat";
  /** VIDEO-COMPOSER-03: distribute compact toolbar controls on either side like Grok Imagine. */
  chatDistribution?: "start_end";
  /** VIDEO-UI-03: up to 4 idea chips shown while the box is empty. */
  suggestions?: readonly PromptBarSuggestion[];
  /** VIDEO-UI-03: the small line under the submit button (a time, never credits). */
  submitDetail?: string;
  /** VIDEO-UI-03: words on the dock's button and the sheet's title. Default "Options". */
  optionsLabel?: string;
  /** VIDEO-UI-03: words on the fold. Default "More settings". */
  foldLabel?: string;
  /** STYLES-04: up to 2 chips drawn under the box as "Style: <name>" with a remove button. A chip left on is the person's yes; the host decides what that sends. */
  suggestedStyles?: readonly PromptBarSuggestedStyle[];
  /** STYLES-04: called with the id when the person removes a suggested chip. */
  onDismissSuggestion?: (id: string) => void;
  shape?: "default" | "pill";
  accent?: "create";
}

type Mode = "inline" | "panel" | "dock";

/** The choices of a chip that are not locked. */
function openOptions(chip: PromptBarChip): PromptBarOption[] {
  return chip.options.filter((o): o is PromptBarOption => !isLockedOption(o));
}

function chosenLabel(chip: PromptBarChip): string {
  return openOptions(chip).find((o) => String(o.value) === String(chip.value))?.label ?? "";
}

/** VIDEO-LORA-09: the cards of one chip, then one plain line under them: why the chip is disabled, else the chosen option's note. */
function ChipCards({ chip, locked, columns }: { chip: PromptBarChip; locked: boolean; columns: "auto" | "three" | "six" }) {
  const note = chip.disabledReason ?? openOptions(chip).find((o) => String(o.value) === String(chip.value))?.note;
  return (
    <>
      <OptionCards chipId={chip.id} label={chip.label} options={chip.options} value={chip.value} disabled={locked || Boolean(chip.disabledReason)} columns={columns} onValueChange={chip.onValueChange} />
      {note ? <p role="status" data-slot="prompt-bar-chip-note" data-disabled={chip.disabledReason ? "true" : undefined} className="text-sm text-muted-foreground">{note}</p> : null}
    </>
  );
}

/** The prompt box of a make flow: a text box, chips that each choose one value, the Standard, Boost, Max segment and one Make button.
 * It holds no state of its own. Videos Create draws it through the `prompt_bar` schema node and the chat video card draws it directly. */
export function PromptBar({ label, placeholder, value, onValueChange, maxLength, chips = [], modeSelector, references = [], tier, submitLabel = i18n._({ id: "ui.Make", message: "Make" }), fieldSize = "default", submitDetailPlacement = "below", onSubmit, busy = false, disabledReason, leading, error, className, placement = "inline", layout: barLayout = "block", chatDistribution, suggestions = [], submitDetail, optionsLabel = i18n._({ id: "ui.Options", message: "Options" }), foldLabel = i18n._({ id: "ui.More settings", message: "More settings" }), suggestedStyles = [], onDismissSuggestion, shape = "default", accent }: PromptBarProps) {
  const layout = useSplitViewLayout();
  const phone = useIsPhoneLayout();
  const mode: Mode = placement === "panel" && layout ? (layout === "side" ? "panel" : "dock") : "inline";
  const [sheetOpen, setSheetOpen] = useState(false);
  const field = useRef<HTMLTextAreaElement | null>(null);
  const detailId = useId();
  const blocked = busy || Boolean(disabledReason);
  const empty = value.trim() === "";
  const ready = !blocked && !empty;
  const canChatSubmit = !busy && !empty;
  // Engine availability disables the submit action, not composition. People can draft words and
  // choose settings while an engine is stopped or being installed.
  const locked = false;
  const inComposer = mode === "inline" && (barLayout === "composer" || barLayout === "chat");
  const inChat = mode === "inline" && barLayout === "chat";
  const inField = references.find((r) => (r.placement === "in_field" || r.placement === "tile") && r.kind !== "audio" && r.kind !== "video");
  const rowRefs = references.filter((r) => r !== inField);
  const unfolded = chips.filter((c) => !c.fold);
  const folded = chips.filter((c) => c.fold);
  const shown = suggestions.slice(0, 4);

  function trySubmit() { if (chatDistribution === "start_end" && inChat ? canChatSubmit : ready) onSubmit(); }

  const errorRow = (
    <>
      {error ? (
        // An in-flow status row (the status card's problem tokens), never floating text over the field.
        <p role="alert" data-slot="prompt-bar-error" data-status-kind="problem" className="flex w-full min-w-0 items-start gap-2 rounded-xl bg-[var(--tint-problem)] px-3 py-2 text-sm text-[var(--destructive)] ring-1 ring-inset ring-[var(--tint-problem-border)]">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
        </p>
      ) : null}
    </>
  );
  const disabledNote = disabledReason ? <p role="status" data-slot="prompt-bar-note" className="text-sm text-muted-foreground">{disabledReason}</p> : null;
  // The dock keeps both together above its field; the inline and panel placements draw the error above the field and the reason under it.
  const notes = <>{disabledNote}{errorRow}</>;

  const large = fieldSize === "large";
  const textbox = (rows: number, extra?: string) => {
    const bare = mode !== "inline" || Boolean(inField) || inComposer;
    return (
      <Textarea
        ref={field}
        shape={inChat ? "default" : "rounded"}
        maxRows={rows}
        rows={inChat ? 1 : undefined}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={locked}
        className={cn(bare && "rounded-2xl border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent dark:disabled:bg-transparent", inChat && "aui-composer-input min-h-10 max-h-48 resize-none rounded-none px-2.5 py-1 text-base leading-6", extra, large && mode !== "dock" && "min-h-[calc(5lh+1.5rem)]")}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); trySubmit(); }
        }}
      />
    );
  };

  const suggestionRow = shown.length > 0 && empty && !locked ? (
    <div role="group" aria-label={i18n._({ id: "ui.Ideas", message: "Ideas" })} data-slot="prompt-bar-suggestions" className={cn("flex min-w-0 gap-2", mode === "dock" ? "flex-nowrap overflow-x-auto" : "flex-wrap")}>
      {shown.map((s) => (
        <Button key={s.label} type="button" variant="outline" shape="pill" size="sm" className="shrink-0" onClick={() => { onValueChange(s.text); field.current?.focus(); }}>{s.label}</Button>
      ))}
    </div>
  ) : null;

  const suggested = suggestedStyles.slice(0, 2);
  const suggestedRow = suggested.length > 0 && !locked ? (
    <div role="group" aria-label={i18n._({ id: "ui.Suggested styles", message: "Suggested styles" })} data-slot="prompt-bar-suggested" className="flex min-w-0 flex-wrap items-center gap-2">
      {suggested.map((s) => {
        return (
          <span key={s.id} data-suggested={s.id} className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full border border-input bg-muted py-1 pl-3 pr-1 text-sm text-foreground">
            <span className="min-w-0 truncate">{s.kind === "character" ? i18n._({ id: "ui.Character: {name}", message: "Character: {name}", values: { name: s.name } }) : i18n._({ id: "ui.Style: {name}", message: "Style: {name}", values: { name: s.name } })}</span>
            <button type="button" aria-label={s.kind === "character" ? i18n._({ id: "ui.Remove character {name}", message: "Remove character {name}", values: { name: s.name } }) : i18n._({ id: "ui.Remove style {name}", message: "Remove style {name}", values: { name: s.name } })} onClick={() => onDismissSuggestion?.(s.id)} className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-background hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <X className="size-4" aria-hidden="true" />
            </button>
          </span>
        );
      })}
    </div>
  ) : null;

  const fieldBox = (rows: number, dock: boolean) => {
    if (mode === "inline" && !inField && !inComposer) return textbox(rows);
    if (inComposer && !inField) return textbox(rows);
    const filled = Boolean(inField?.value);
    return (
      <div data-slot="prompt-bar-field" className={cn("flex min-w-0 flex-1 flex-col border transition-colors", inComposer ? "rounded-xl border-0 bg-transparent p-0 shadow-none" : shape === "pill" ? "rounded-[28px] border-[var(--hairline)] bg-[var(--surface-2)] p-1" : "rounded-2xl border-input bg-transparent dark:bg-input/30", !inComposer && "focus-within:border-ring focus-within:ring-3", accent === "create" ? "focus-within:ring-[var(--accent-create)]/50" : "focus-within:ring-ring/50", shape === "default" && "") }>
        {inField && filled && !inChat ? <InFieldThumb reference={inField} locked={locked} compact={dock} /> : null}
        {textbox(rows, dock ? "min-h-12 resize-none py-3" : undefined)}
        {inField && !filled && !dock && !inChat && inField.placement === "tile" ? (
          <div className="flex px-3 pb-3"><ReferenceTile reference={inField} locked={locked} /></div>
        ) : null}
        {inField && !filled && !dock && !inChat && inField.placement !== "tile" ? (
          <div className="flex px-2 pb-2">
            <button type="button" aria-label={i18n._({ id: "ui.Add {label}", message: "Add {label}", values: { label: inField.label } })} disabled={locked || inField.disabled} onClick={inField.onPick} className="flex min-h-12 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
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
      {list.map((ref) => ref.placement === "tile" && !ref.value ? <ReferenceTile key={ref.id} reference={ref} locked={locked} /> : <ReferenceSlot key={ref.id} reference={ref} locked={locked} />)}
    </div>
  ) : null;

  const dropdown = (chip: PromptBarChip, compact = false) => {
    const selected = openOptions(chip).find((o) => String(o.value) === String(chip.value));
    const SelectedIcon = selected?.icon ? getIcon(selected.icon) : null;
    return <Select key={chip.id} value={String(chip.value)} disabled={locked || Boolean(chip.disabledReason)} onValueChange={(next) => {
      const picked = openOptions(chip).find((o) => String(o.value) === next);
      if (picked) chip.onValueChange(picked.value);
    }}>
      <SelectTrigger data-chip={chip.id} aria-label={chip.label} title={chip.iconOnly ? `${chip.label}: ${selected?.label ?? ""}` : undefined} shape="pill" className={cn("shrink-0", chip.iconOnly ? "size-11 justify-center px-2 sm:size-9" : compact ? "min-h-11 px-3 text-sm sm:min-h-9" : "min-h-[48px]")}>
        {SelectedIcon ? <SelectedIcon className="size-4 shrink-0" aria-hidden="true" /> : null}{chip.iconOnly ? <SelectValue className="sr-only">{selected?.label}</SelectValue> : <SelectValue placeholder={chip.label}>{selected?.label}</SelectValue>}
      </SelectTrigger>
      <SelectContent>
        {openOptions(chip).map((option) => {
          const Icon = option.icon ? getIcon(option.icon) : null;
          return <SelectItem key={String(option.value)} value={String(option.value)}><span className="flex items-center gap-2">{Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}{option.label}</span></SelectItem>;
        })}
      </SelectContent>
    </Select>;
  };

  const modeControl = modeSelector ? (() => {
    return <Select value={modeSelector.value} onValueChange={(next) => modeSelector.onValueChange(next)}>
      <SelectTrigger data-slot="prompt-bar-mode" aria-label={modeSelector.label} shape="pill" className="min-h-11 shrink-0 px-3 text-sm sm:min-h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{modeSelector.options.map((option) => {
        const OptionIcon = option.icon ? getIcon(option.icon) : null;
        return <SelectItem key={String(option.value)} value={String(option.value)}><span className="flex items-center gap-2">{OptionIcon ? <OptionIcon className="size-4 shrink-0" aria-hidden="true" /> : null}{option.label}</span></SelectItem>;
      })}</SelectContent>
    </Select>;
  })() : null;

  const cardsSection = (chip: PromptBarChip, columns: "auto" | "three" = "auto") => (
    <div key={chip.id} data-slot="prompt-bar-cards" className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{chip.label}</span>
      <ChipCards chip={chip} locked={locked} columns={columns} />
    </div>
  );

  /** Chips drawn flat: cards as sections, dropdowns in a row. Used where there is room for everything (the sheet) and for folded chips. */
  const flatChips = (list: readonly PromptBarChip[], columns: "auto" | "three") => {
    const dropdowns = list.filter((c) => c.variant !== "cards");
    return (
      <>
        {list.filter((c) => c.variant === "cards").map((c) => cardsSection(c, columns))}
        {dropdowns.length > 0 ? <div data-slot="prompt-bar-chips" className="flex min-w-0 flex-wrap items-center gap-2">{dropdowns.map((chip) => dropdown(chip))}</div> : null}
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

  const tierSegment = tier ? <TierSegment {...tier} density={inChat ? "compact" : undefined} /> : null;
  const toolbarChips = chatDistribution === "start_end" && inChat
    ? [...unfolded.filter((c) => c.align !== "end"), ...unfolded.filter((c) => c.align === "end")]
    : unfolded;
  const startChips = toolbarChips.filter((c) => c.align !== "end");
  const endChips = toolbarChips.filter((c) => c.align === "end");
  const renderChatChips = (list: readonly PromptBarChip[]) => {
    const groupsForList = groupsOf(list);
    return <>
      {groupsForList.map((g) => <StyleGroup key={g.name} name={g.name} chips={g.chips} locked={locked} sheet={phone} side="bottom" compact dropdown={(chip) => dropdown(chip, true)} cards={(c, wide) => <ChipCards chip={c} locked={locked} columns={wide ? "six" : "auto"} />} />)}
      {list.filter((c) => c.presentation !== "popover" && c.variant !== "cards").map((chip) => dropdown(chip, true))}
      {list.filter((c) => c.presentation !== "popover" && c.variant === "cards").map((c) => cardsSection(c))}
    </>;
  };
  const inButton = submitDetailPlacement === "in_button" && Boolean(submitDetail);

  // VIDEO-UI-12: the label and the time as two lines inside the button. The button keeps its own name (the label); the time is its description.
  const buttonFace = (
    <span className="flex min-w-0 flex-col items-center leading-tight">
      <span>{submitLabel}</span>
      <span id={detailId} data-slot="prompt-bar-detail" className="text-sm font-normal opacity-90">{submitDetail}</span>
    </span>
  );
  const submitButton = (sheet: boolean) => (
    <Button
      type={sheet ? "button" : "submit"}
      size="lg"
      width="full"
      disabled={!ready}
      aria-describedby={submitDetail ? detailId : undefined}
      aria-label={inButton ? submitLabel : undefined}
      className={cn(inButton && "h-16")}
      onClick={sheet ? () => { if (ready) { setSheetOpen(false); onSubmit(); } } : undefined}
    >{inButton ? buttonFace : submitLabel}</Button>
  );
  const detailLine = submitDetail && !inButton ? <p id={detailId} data-slot="prompt-bar-detail" className="text-center text-sm text-muted-foreground">{submitDetail}</p> : null;

  // ---- inline: the original block, in its original order ----
  if (mode === "inline") {
    const groups = groupsOf(unfolded);
    const plainChips = unfolded.filter((c) => c.presentation !== "popover");
    if (inComposer) {
      return (
        <form data-slot="prompt-bar" data-layout={barLayout} className={cn("flex w-full min-w-0 flex-col gap-2", className)} onSubmit={(e) => { e.preventDefault(); trySubmit(); }}>
          {errorRow}
          <div data-slot="prompt-bar-composer" data-chat-input={inChat ? "true" : undefined} className={cn("flex min-w-0 flex-col rounded-2xl border border-input bg-background p-2 shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30", inChat ? "gap-1" : "gap-2")}>
            {refsRow(rowRefs)}
            {inChat && inField?.value ? <InFieldThumb reference={inField} locked={locked} compact /> : null}
            {fieldBox(5, false)}
            {suggestionRow}
            {suggestedRow}
            {inChat || leading || groups.length > 0 || plainChips.length > 0 || tierSegment ? (
              <div data-slot="prompt-bar-composer-controls" className={cn("flex min-w-0 flex-wrap items-center gap-1.5", inChat ? "pt-1" : "border-t border-border/70 pt-2")}>
                {inChat && inField && !inField.value && inField.placement !== "tile" ? (
                  <button type="button" aria-label={i18n._({ id: "ui.Add {label}", message: "Add {label}", values: { label: inField.label } })} title={inField.label} disabled={locked || inField.disabled} onClick={inField.onPick} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 sm:size-9">
                    <ImageIcon className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
                {leading}
                {modeControl}
                {chatDistribution === "start_end" && inChat ? (
                  <>
                    {renderChatChips(startChips)}
                    <span className="flex-1" aria-hidden="true" />
                    {renderChatChips(endChips)}
                  </>
                ) : <>
                    {groups.map((g) => <StyleGroup key={g.name} name={g.name} chips={g.chips} locked={locked} sheet={phone} side="bottom" compact={inChat} dropdown={(chip) => dropdown(chip, inChat)} cards={(c, wide) => <ChipCards chip={c} locked={locked} columns={wide ? "six" : "auto"} />} />)}
                    {plainChips.filter((c) => c.variant !== "cards").map((chip) => dropdown(chip, inChat))}
                    {plainChips.filter((c) => c.variant === "cards").map((c) => cardsSection(c))}
                  </>}
                {!(inChat && chatDistribution === "start_end") ? tierSegment : null}
                {inChat && submitDetail ? <span id={detailId} className="sr-only min-w-0 truncate px-1 text-xs text-muted-foreground lg:not-sr-only">{submitDetail}</span> : null}
                {inChat ? (
                  chatDistribution === "start_end" ? (
                    <div data-slot="prompt-bar-trailing-controls" className="ml-auto flex shrink-0 items-center gap-1">
                      {tierSegment}
                      <Button type="submit" size="icon" shape="pill" disabled={!canChatSubmit} className="size-11 shrink-0 sm:size-9" aria-describedby={submitDetail ? detailId : undefined} aria-label={submitLabel} title={submitDetail ? `${submitLabel} · ${submitDetail}` : submitLabel}>
                        <ArrowUp className="size-5" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : <Button type="submit" size="icon" shape="pill" disabled={!ready} className="ml-auto size-11 shrink-0 sm:size-9" aria-describedby={submitDetail ? detailId : undefined} aria-label={submitLabel} title={submitDetail ? `${submitLabel} · ${submitDetail}` : submitLabel}>
                    <ArrowUp className="size-5" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button type="submit" shape={shape === "pill" ? "pill" : undefined} disabled={!ready} className="ml-auto min-h-12 shrink-0 px-4" aria-describedby={submitDetail ? detailId : undefined} aria-label={inButton ? submitLabel : undefined}>
                    {inButton ? buttonFace : submitLabel}
                  </Button>
                )}
              </div>
            ) : null}
            {fold}
          </div>
          {detailLine}
          {disabledNote}
        </form>
      );
    }
    return (
      <form
        data-slot="prompt-bar"
        className={cn("flex w-full min-w-0 flex-col gap-3", className)}
        onSubmit={(e) => { e.preventDefault(); trySubmit(); }}
      >
        {errorRow}
        {fieldBox(8, false)}
        {suggestionRow}
        {suggestedRow}
        {refsRow(rowRefs)}
        {plainChips.filter((c) => c.variant === "cards").map((c) => cardsSection(c))}
        {leading || groups.length > 0 || plainChips.some((c) => c.variant !== "cards") ? (
          <div data-slot="prompt-bar-chips" className="flex min-w-0 flex-nowrap touch-pan-x items-center gap-2 overflow-x-auto overflow-y-hidden sm:flex-wrap sm:overflow-visible">
            {leading}
            {groups.map((g) => <StyleGroup key={g.name} name={g.name} chips={g.chips} locked={locked} sheet={phone} side="bottom" dropdown={dropdown} cards={(c, wide) => <ChipCards chip={c} locked={locked} columns={wide ? "six" : "auto"} />} />)}
            {plainChips.filter((c) => c.variant !== "cards").map((chip) => dropdown(chip))}
          </div>
        ) : null}
        {tierSegment}
        {fold}
        <div className="flex items-center gap-3">
          <Button type="submit" shape={shape === "pill" ? "pill" : undefined} disabled={!ready} className={cn("min-h-[48px] px-6", inButton && "h-16")} aria-describedby={submitDetail ? detailId : undefined} aria-label={inButton ? submitLabel : undefined}>{inButton ? buttonFace : submitLabel}</Button>
        </div>
        {detailLine}
        {disabledNote}
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
        ordered.push(<StyleGroup key={`g-${name}`} name={name} chips={g.chips} locked={locked} sheet={false} side="right" block dropdown={dropdown} cards={(c, wide) => <ChipCards chip={c} locked={locked} columns={wide ? "six" : "auto"} />} />);
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
          {errorRow}
          {fieldBox(10, false)}
          {suggestionRow}
          {suggestedRow}
          {refsRow(rowRefs)}
          {ordered}
          {tierSegment}
          {leading || dropdowns.length > 0 ? (
            <div data-slot="prompt-bar-chips" className="flex min-w-0 flex-wrap items-center gap-2">
              {leading}
              {dropdowns.map((chip) => dropdown(chip))}
            </div>
          ) : null}
          {fold}
        </div>
        <div data-slot="prompt-bar-foot" className="flex shrink-0 flex-col gap-2 border-t border-border p-4">
          {submitButton(false)}
          {detailLine}
          {disabledNote}
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
        {suggestedRow}
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
          <button type="button" aria-label={i18n._({ id: "ui.Remove {label}", message: "Remove {label}", values: { label: ref.label } })} disabled={locked} onClick={ref.onRemove} className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border bg-background text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </>
      ) : (
        <button type="button" aria-label={i18n._({ id: "ui.Add {label}", message: "Add {label}", values: { label: ref.label } })} disabled={locked || ref.disabled} onClick={ref.onPick} className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground outline-none transition-colors hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
          {ref.kind === "audio" || ref.kind === "video" ? <KindIcon kind={ref.kind} className="size-5" /> : <Plus className="size-5" aria-hidden="true" />}
          <span className="max-w-full truncate px-1 text-xs">{ref.label}</span>
        </button>
      )}
    </div>
  );
}

/** VIDEO-UI-12: the empty `tile` slot: a full-width dashed tile with an icon, the label and a one-line hint. */
function ReferenceTile({ reference: ref, locked }: { reference: PromptBarReference; locked: boolean }) {
  return (
    <button
      type="button"
      data-slot="prompt-bar-tile"
      data-reference={ref.id}
      aria-label={i18n._({ id: "ui.Add {label}", message: "Add {label}", values: { label: ref.label } })}
      disabled={locked || ref.disabled}
      onClick={ref.onPick}
      className="flex min-h-16 w-full min-w-0 items-center gap-3 rounded-xl border-2 border-dashed border-border p-3 text-left text-muted-foreground outline-none transition-colors hover:border-primary hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"><Plus className="size-5" aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{ref.label}</span>
        {ref.hint ? <span className="text-sm text-muted-foreground">{ref.hint}</span> : null}
      </span>
    </button>
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
        <button type="button" aria-label={i18n._({ id: "ui.Remove {label}", message: "Remove {label}", values: { label: ref.label } })} disabled={locked} onClick={ref.onRemove} className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50">
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

/** One trigger for several chips (Look, Camera, Sound): two small thumbnails and the chosen words, opening one popover, or a sheet
 * on a phone. A text chip may be in the group. */
function StyleGroup({ name, chips, locked, sheet, side, block, compact = false, dropdown, cards }: {
  name: string;
  chips: readonly PromptBarChip[];
  locked: boolean;
  sheet: boolean;
  side: "right" | "bottom";
  block?: boolean;
  compact?: boolean;
  dropdown: (chip: PromptBarChip) => ReactNode;
  cards: (chip: PromptBarChip, wide: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const banner = chips.find((c) => c.trigger !== undefined)?.trigger === "banner";
  const wide = chips.find((c) => c.popoverSize !== undefined)?.popoverSize === "wide";
  const cardChips = chips.filter((c) => c.variant === "cards");
  const shownChips = chips.filter((c) => c.quietValue === undefined || String(c.quietValue) !== String(c.value));
  const thumbs = shownChips.filter((c) => c.variant === "cards").map((c) => openOptions(c).find((o) => String(o.value) === String(c.value))?.media).filter((m): m is string => Boolean(m)).slice(0, 2);
  const summary = (shownChips.length > 0 ? shownChips : chips.slice(0, 1)).map(chosenLabel).filter(Boolean).join(", ");
  const bannerSrc = cardChips.filter((c) => shownChips.includes(c)).map((c) => openOptions(c).find((o) => String(o.value) === String(c.value))?.media).find((m): m is string => Boolean(m));
  const bannerNames = cardChips.map((c) => c.label.toLowerCase());
  const bannerEyebrow = bannerNames.length > 1 ? i18n._({ id: "ui.{names} and {last}", message: "{names} and {last}", values: { names: bannerNames.slice(0, -1).join(", "), last: bannerNames[bannerNames.length - 1] } }) : (bannerNames[0] ?? name.toLowerCase());
  const bannerTrigger = (
    <button
      type="button"
      data-slot="prompt-bar-group"
      data-trigger="banner"
      data-group={name}
      disabled={locked}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={sheet ? () => setOpen(true) : undefined}
      className="group/banner relative block aspect-[16/6] w-full min-w-0 overflow-hidden rounded-2xl border border-input bg-muted text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
    >
      {bannerSrc ? <span className="absolute inset-0"><OptionThumb src={bannerSrc} /></span> : null}
      <span aria-hidden="true" className="absolute inset-0 bg-[image:var(--art-scrim)]" />
      <span className="absolute inset-x-0 bottom-0 flex min-w-0 items-end justify-between gap-3 p-3 text-[var(--art-foreground)]">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-xs uppercase tracking-wide">{bannerEyebrow}</span>
          <span className="truncate text-lg font-semibold">{summary}</span>
        </span>
        <span className="flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-[var(--art-overlay)] px-3 text-sm font-medium">
          {i18n._({ id: "ui.Change", message: "Change" })}
          <ChevronDown className="size-4" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
  // The banner's visible name sits above it, outside the button, so the popover trigger stays the button itself.
  const labelled = (node: ReactNode) => banner ? (
    <div data-slot="prompt-bar-banner" className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{name}</span>
      {node}
    </div>
  ) : node;
  const trigger = banner ? bannerTrigger : (
    <button
      type="button"
      data-slot="prompt-bar-group"
      data-group={name}
      disabled={locked}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={sheet ? () => setOpen(true) : undefined}
      aria-label={compact ? `${name}: ${summary}` : undefined}
      className={cn("flex min-w-0 items-center border border-input bg-transparent text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50", compact ? "min-h-11 shrink-0 gap-1.5 rounded-full px-3 py-1 text-sm sm:min-h-9" : "min-h-12 gap-3 rounded-2xl p-2 pr-3", block ? "w-full" : "shrink-0")}
    >
      {!compact && thumbs.length > 0 ? (
        <span className="flex shrink-0 gap-1">
          {thumbs.map((src, i) => <span key={i} className="size-10 overflow-hidden rounded-lg bg-muted"><OptionThumb src={src} /></span>)}
        </span>
      ) : null}
      <span className={cn("flex min-w-0", compact ? "items-center" : "flex-1 flex-col")}>
        {!compact ? <span className="text-xs font-medium text-muted-foreground">{name}</span> : null}
        <span className={cn("truncate", compact ? "text-sm" : "text-sm")}>{compact ? `${name}: ${summary}` : summary}</span>
      </span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
  const wideCards = wide && !sheet;
  const section = (chip: PromptBarChip) => (
    <div key={chip.id} data-slot="prompt-bar-cards" className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{chip.label}</span>
      {cards(chip, wideCards)}
    </div>
  );
  const body = (
    <div data-slot="prompt-bar-group-body" data-size={wideCards ? "wide" : undefined} className="flex min-w-0 flex-col gap-4">
      {chips.map((chip) => chip.variant === "cards" ? section(chip) : <div key={chip.id} className="flex min-w-0 flex-wrap gap-2">{dropdown(chip)}</div>)}
      <Button type="button" variant="outline" width="full" onClick={() => setOpen(false)}>{i18n._({ id: "ui.Done", message: "Done" })}</Button>
    </div>
  );
  if (sheet) {
    return (
      <>
        {labelled(trigger)}
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
      {labelled(<PopoverTrigger asChild>{trigger}</PopoverTrigger>)}
      <PopoverContent width="auto" side={side} align="start" aria-label={name} className={cn("max-h-[min(70dvh,36rem)] overflow-y-auto", wide ? "w-[min(92vw,47.5rem,var(--radix-popper-available-width,92vw))]" : "w-[min(92vw,32rem,var(--radix-popper-available-width,92vw))]")}>
        {body}
      </PopoverContent>
    </Popover>
  );
}
