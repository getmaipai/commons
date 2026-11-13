"use client";

// ONE-COMPOSER-2026-11-13 (COMPOSER-01 and COMPOSER-02): the parts of the one composer, defined once. `PromptBar` (Create pages, the Home
// ask box) and the chat `Thread` both draw these; neither keeps a second copy. Every part is data in, events out: the host decides what
// a mode means, the kit draws it. Motion comes from the MOTION-01 tokens only (`motion-fade`, `--motion-collapse-*`), so reduced motion
// and the calm setting already zero it.

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, Film, Image as ImageIcon, MapPin, Music, Plus, Sparkles, Trash2, User, Wand2, X, Eraser, SlidersHorizontal } from "lucide-react";
import { cn } from "cn";
import { hitArea } from "../utils";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useIsPhoneLayout } from "../hooks/useIsPhoneLayout";
import { SafeImage } from "../primitives/SafeImage";
import { OptionCards, type LockedOptionCard, type OptionCard } from "./option-cards";
import { i18n } from "@/kit/i18n";
import { getIcon, type IconName } from "../icons";

/** The band the host reports for the signed-in person. Anything but `adult` is treated as restricted. */
export type ComposerBand = "child" | "teen" | "adult";

export type ComposerTool = "clear" | "improve" | "lyrics";

export interface ComposerSlotData {
  id: string;
  label: string;
  kind: "picture" | "character" | "place" | "audio" | "video";
  /** The most files this slot takes (shown in the accessible name of an empty slot when above one). */
  max?: number;
  /** The chosen file id; empty or absent while the slot is empty. */
  value?: string | null;
  /** A resolved address for the thumbnail of a filled slot. */
  thumb?: string;
  onPick?: () => void;
  onRemove?: () => void;
  /** Set when the slot cannot be filled right now; the plain reason shows as its tooltip and accessible description. */
  disabledReason?: string;
}

export interface ComposerChipOptionData {
  value: string | number;
  label: string;
  /** One plain line under the label in the popover (for Quality: "Fast", "More detail", "Best quality"). */
  detail?: string;
}

/** One value the person chooses. Chips with the same `group` open one popover. `disabledReason` draws the chip disabled with the reason. */
export interface ComposerChipData {
  id: string;
  label: string;
  group?: string;
  options: readonly ComposerChipOptionData[];
  value: string | number;
  onValueChange: (value: string | number) => void;
  disabledReason?: string;
  /** COMPOSER-03: `cards` draws the options as picture cards (a Look or Camera loop) inside the group's one popover, with `cardOptions`
   * (which may end in one locked tile). Plain `options` still name the choice in the trigger's words. */
  variant?: "cards";
  cardOptions?: readonly (OptionCard | LockedOptionCard)[];
  /** COMPOSER-03: while this value is chosen the chip adds nothing to the trigger's words (an "Auto" or "No style" default). */
  quietValue?: string | number;
  /** COMPOSER-03: one plain line under the options while the chip is open. */
  note?: string;
}

/** The Presets button: one popover over chips the host already has (templates, styles, formats). */
export interface ComposerPresetsData {
  label?: string;
  chips: readonly ComposerChipData[];
}

export interface ComposerPrimaryData {
  label: string;
  /** A time, never a price (VIDEO-UI-03). Shown as the button's description. */
  detail?: string;
}

/** One mode of the one composer. Data only: the host owns what a mode does. */
export interface ComposerModeData {
  id: string;
  label: string;
  icon: IconName;
  /** Cross-faded into the field when this mode is picked. */
  placeholder?: string;
  references?: readonly ComposerSlotData[];
  chips?: readonly ComposerChipData[];
  presets?: ComposerPresetsData;
  tools?: readonly ComposerTool[];
  /** Why a tool is unavailable right now (a plain line), by tool. */
  toolDisabledReasons?: Partial<Record<ComposerTool, string>>;
  primary?: ComposerPrimaryData;
  /** The round "+" at the start of the top row (the attach menu). Drawn only when given. */
  onAdd?: () => void;
}

export type ComposerQualityKind = "tier" | "thinking" | "model";

export interface ComposerQualityOption {
  value: string;
  label: string;
  detail?: string;
  /** `tier` (Standard, Boost, Max) is offered to everyone. `thinking` and `model` are offered to adults only. Default `tier`. */
  kind?: ComposerQualityKind;
}

/** The one Quality chip (Standard, Boost, Max), in the same place in chat and in Create. */
export interface ComposerQualityData {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly ComposerQualityOption[];
  /** The band comes in as data. Missing counts as restricted: no Thinking and no model choice. */
  band?: ComposerBand;
  label?: string;
  disabledReason?: string;
}

/** What the kit shows of a Quality chip for this band. A child or teen never sees Thinking or a model choice. */
export function qualityChipFor(quality: ComposerQualityData | undefined): ComposerChipData | null {
  if (!quality) return null;
  const adult = quality.band === "adult";
  const options = quality.options.filter((o) => adult || (o.kind ?? "tier") === "tier");
  if (options.length === 0) return null;
  const value = options.some((o) => o.value === quality.value) ? quality.value : options[0]!.value;
  return {
    id: "quality",
    label: quality.label ?? i18n._({ id: "ui.Quality", message: "Quality" }),
    options: options.map(({ value: v, label, detail }) => ({ value: v, label, detail })),
    value,
    onValueChange: (next) => quality.onValueChange(String(next)),
    disabledReason: quality.disabledReason,
  };
}

/** The value of `data-placeholder-fade`: it flips between two names when the placeholder changes, which restarts the CSS cross-fade
 * (tokens.css) without remounting the field, so focus and the caret stay put. Undefined until the first change. */
export function usePlaceholderFade(placeholder: string | undefined): "a" | "b" | undefined {
  const [flip, setFlip] = useState<"a" | "b" | undefined>(undefined);
  const previous = useRef(placeholder);
  useEffect(() => {
    if (previous.current === placeholder) return;
    previous.current = placeholder;
    setFlip((f) => (f === "a" ? "b" : "a"));
  }, [placeholder]);
  return flip;
}

const SLOT_ICON = { picture: ImageIcon, character: User, place: MapPin, audio: Music, video: Film } as const;

// One look for every control in the panel: plain text-and-icon buttons with a small chevron, no box, no select border. Only the mode pill
// (a raised surface) and the Presets pill (a soft fill) are drawn as shapes.
const CHIP = `flex min-h-12 shrink-0 items-center gap-1.5 rounded-full px-3 text-base text-foreground transition-colors hover:bg-foreground/5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-expanded:bg-foreground/5 disabled:opacity-50 ${hitArea(1)}`;
const RAISED = `flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[var(--surface-1)] px-4 text-base font-medium text-foreground shadow-sm ring-1 ring-inset ring-[var(--hairline)] transition-colors hover:bg-foreground/5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${hitArea(1)}`;
const SOFT = `flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-foreground/5 px-4 text-base text-foreground transition-colors hover:bg-foreground/10 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${hitArea(1)}`;

function chosenLabel(chip: ComposerChipData): string {
  if (chip.quietValue !== undefined && String(chip.quietValue) === String(chip.value)) return "";
  return chip.options.find((o) => String(o.value) === String(chip.value))?.label ?? "";
}

/** The mode pill: an icon and the mode's words, opening the list of modes. A listbox with arrow keys, Enter and Escape. */
export function ComposerModePill({ modes, mode, onModeChange, onChosen }: {
  modes: readonly ComposerModeData[];
  mode: string;
  onModeChange: (id: string) => void;
  /** Called around the change so a host can keep the field's focus and caret. */
  onChosen?: (change: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const button = useRef<HTMLButtonElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const current = modes.find((m) => m.id === mode) ?? modes[0];
  if (!current) return null;
  const Icon = getIcon(current.icon);
  const indexOfCurrent = () => Math.max(0, modes.findIndex((m) => m.id === current.id));
  const choose = (id: string) => {
    const change = () => onModeChange(id);
    if (onChosen) onChosen(change); else change();
    setOpen(false);
    if (!onChosen) requestAnimationFrame(() => button.current?.focus({ preventScroll: true }));
  };
  const openList = () => { setOpen(true); setHighlighted(indexOfCurrent()); requestAnimationFrame(() => list.current?.focus()); };
  return (
    <div data-slot="composer-mode-pill" className="relative shrink-0" onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); button.current?.focus(); } }}>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={i18n._({ id: "ui.Mode: {label}", message: "Mode: {label}", values: { label: current.label } })}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); openList(); } }}
        className={RAISED}
      >
        <Icon className="size-4" aria-hidden="true" /><span>{current.label}</span><ChevronDown className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={list}
          role="listbox"
          aria-label={i18n._({ id: "ui.Composer modes", message: "Composer modes" })}
          tabIndex={-1}
          className="absolute bottom-full left-0 z-50 mb-2 min-w-44 motion-reveal rounded-xl border border-border bg-popover/90 p-1.5 text-popover-foreground shadow-lg backdrop-blur-xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setHighlighted((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + modes.length) % modes.length); }
            if (e.key === "Enter") { e.preventDefault(); const chosen = modes[highlighted]; if (chosen) choose(chosen.id); }
          }}
        >
          {modes.map((item, index) => {
            const ItemIcon = getIcon(item.icon);
            return (
              <button key={item.id} role="option" aria-selected={item.id === current.id} type="button" onMouseEnter={() => setHighlighted(index)} onClick={() => choose(item.id)} className={cn("flex min-h-12 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted", index === highlighted && "bg-muted")}>
                <ItemIcon className="size-4" aria-hidden="true" /><span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** The round "+" at the start of the top row. */
export function ComposerAddButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button type="button" data-slot="composer-add" aria-label={i18n._({ id: "ui.Add files", message: "Add files" })} onClick={onAdd} className={cn("flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground outline-none transition-colors hover:bg-foreground/10 focus-visible:ring-[3px] focus-visible:ring-ring/50", hitArea(1))}>
      <Plus className="size-5" aria-hidden="true" />
    </button>
  );
}

/** The reference slots of the current mode: a dashed add button per empty slot, a named thumbnail with a remove control per filled one. */
export function ComposerSlots({ slots }: { slots: readonly ComposerSlotData[] }) {
  if (slots.length === 0) return null;
  return (
    <div data-slot="composer-slots" role="group" aria-label={i18n._({ id: "ui.References", message: "References" })} className="flex min-w-0 flex-wrap items-center gap-2">
      {slots.map((slot) => {
        const Icon = SLOT_ICON[slot.kind];
        if (slot.value) {
          return (
            <span key={slot.id} data-slot-id={slot.id} className="flex min-w-0 items-center gap-2 rounded-2xl bg-foreground/5 p-1">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {slot.thumb ? <SafeImage src={slot.thumb} alt={slot.label} className="size-full object-cover" /> : <Icon className="size-4 text-muted-foreground" aria-hidden="true" />}
              </span>
              <span className="min-w-0 max-w-32 truncate text-sm">{slot.label}</span>
              <button type="button" aria-label={i18n._({ id: "ui.Remove {label}", message: "Remove {label}", values: { label: slot.label } })} onClick={slot.onRemove} className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </span>
          );
        }
        const reason = slot.disabledReason;
        return (
          <button
            key={slot.id}
            type="button"
            data-slot-id={slot.id}
            aria-label={i18n._({ id: "ui.Add {label}", message: "Add {label}", values: { label: slot.label } })}
            title={reason}
            aria-disabled={reason ? true : undefined}
            onClick={() => { if (!reason) slot.onPick?.(); }}
            className={cn("flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-foreground/5 px-4 text-base text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50", reason && "opacity-60", hitArea(1))}
          >
            <Icon className="size-5" aria-hidden="true" /><span>{slot.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** One chip's options as a radio group with roving focus: arrows move and choose, Home and End jump. */
function OptionRadios({ chip }: { chip: ComposerChipData }) {
  const disabled = Boolean(chip.disabledReason);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, chip.options.findIndex((o) => String(o.value) === String(chip.value)));
  if (chip.variant === "cards" && chip.cardOptions) {
    return (
      <div data-slot="composer-chip-section" data-chip={chip.id} className="flex min-w-0 flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{chip.label}</span>
        <OptionCards label={chip.label} chipId={chip.id} options={chip.cardOptions} value={chip.value} onValueChange={chip.onValueChange} disabled={disabled} columns="three" />
        {chip.disabledReason ? <p role="status" data-slot="composer-chip-reason" className="text-sm text-muted-foreground">{chip.disabledReason}</p> : chip.note ? <p data-slot="composer-chip-note" className="text-sm text-muted-foreground">{chip.note}</p> : null}
      </div>
    );
  }
  const move = (next: number) => {
    const target = chip.options[(next + chip.options.length) % chip.options.length];
    if (!target) return;
    chip.onValueChange(target.value);
    requestAnimationFrame(() => refs.current[(next + chip.options.length) % chip.options.length]?.focus());
  };
  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(index + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(index - 1); }
    else if (e.key === "Home") { e.preventDefault(); move(0); }
    else if (e.key === "End") { e.preventDefault(); move(chip.options.length - 1); }
  };
  return (
    <div data-slot="composer-chip-section" data-chip={chip.id} className="flex min-w-0 flex-col gap-1.5">
      <span id={`composer-chip-${chip.id}`} className="text-sm font-medium text-muted-foreground">{chip.label}</span>
      <div role="radiogroup" tabIndex={-1} aria-labelledby={`composer-chip-${chip.id}`} aria-disabled={disabled || undefined} onKeyDown={onKey} className="flex min-w-0 flex-wrap gap-1.5">
        {chip.options.map((o, i) => {
          const on = String(o.value) === String(chip.value);
          return (
            <button
              key={String(o.value)}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={disabled || undefined}
              tabIndex={on || (index === i) ? 0 : -1}
              onClick={() => { if (!disabled) chip.onValueChange(o.value); }}
              className={cn("flex min-h-12 min-w-20 flex-col items-start justify-center rounded-xl border px-3 text-left text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50", on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background hover:bg-muted", disabled && "opacity-60")}
            >
              <span className="font-medium">{o.label}</span>
              {o.detail ? <span className="text-xs text-muted-foreground">{o.detail}</span> : null}
            </button>
          );
        })}
      </div>
      {chip.disabledReason ? <p role="status" data-slot="composer-chip-reason" className="text-sm text-muted-foreground">{chip.disabledReason}</p> : null}
    </div>
  );
}

/** Chips that share a `group` fold into one trigger and one popover (a bottom sheet on a phone). The trigger shows the chosen words. */
export function ComposerChipPopover({ name, chips, icon, slot = "composer-chip-group", align = "start", showSummary = true, variant = "plain" }: {
  variant?: "plain" | "soft";
  name: string;
  /** False keeps the trigger reading as the name (the Presets button), not the chosen words. */
  showSummary?: boolean;
  chips: readonly ComposerChipData[];
  icon?: ReactNode;
  slot?: string;
  align?: "start" | "end";
}) {
  const phone = useIsPhoneLayout();
  const [open, setOpen] = useState(false);
  const summary = showSummary ? chips.map(chosenLabel).filter(Boolean).join(" / ") : "";
  const unavailable = chips.every((c) => Boolean(c.disabledReason));
  const reason = chips.find((c) => c.disabledReason)?.disabledReason;
  const trigger = (
    <button
      type="button"
      data-slot={slot}
      data-group={name}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={summary ? i18n._({ id: "ui.{name}: {summary}", message: "{name}: {summary}", values: { name, summary } }) : name}
      title={unavailable ? reason : undefined}
      onClick={phone ? () => setOpen(true) : undefined}
      className={cn(variant === "soft" ? SOFT : CHIP, unavailable && "opacity-60")}
    >
      {icon}<span className="min-w-0 truncate">{summary || name}</span><ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
  const body = <div className="flex min-w-0 flex-col gap-4">{chips.map((c) => <OptionRadios key={c.id} chip={c} />)}</div>;
  if (phone) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent aria-describedby={undefined}>
            <DrawerHeader><DrawerTitle>{name}</DrawerTitle></DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">{body}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} side="top" className="w-80 max-w-[calc(100vw-2rem)]">{body}</PopoverContent>
    </Popover>
  );
}

/** Groups in the order of their first member; a chip with no group is its own group. */
export function groupComposerChips(chips: readonly ComposerChipData[]): { name: string; chips: ComposerChipData[] }[] {
  const groups: { name: string; chips: ComposerChipData[] }[] = [];
  for (const chip of chips) {
    const name = chip.group ?? chip.label;
    const found = groups.find((g) => g.name === name);
    if (found) found.chips.push(chip); else groups.push({ name, chips: [chip] });
  }
  return groups;
}

/** The mode's combined chips, each group one popover trigger, then the Quality chip in its own place. */
export function ComposerChips({ chips, quality }: { chips: readonly ComposerChipData[]; quality?: ComposerChipData | null }) {
  const groups = groupComposerChips(chips);
  if (groups.length === 0 && !quality) return null;
  return (
    <div data-slot="composer-chips" className="flex min-w-0 touch-pan-x flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
      {groups.map((g) => <ComposerChipPopover key={g.name} name={g.name} chips={g.chips} />)}
      {quality ? <ComposerChipPopover name={quality.label} chips={[quality]} slot="composer-quality" icon={<Sparkles className="size-5 shrink-0" aria-hidden="true" />} /> : null}
    </div>
  );
}

/** The Presets button at the right of the top row. */
export function ComposerPresetsButton({ presets }: { presets: ComposerPresetsData }) {
  if (presets.chips.length === 0) return null;
  const name = presets.label ?? i18n._({ id: "ui.Presets", message: "Presets" });
  return <ComposerChipPopover name={name} chips={presets.chips} slot="composer-presets" showSummary={false} variant="soft" icon={<SlidersHorizontal className="size-5 shrink-0" aria-hidden="true" />} align="end" />;
}

/** The field-end tools: clear, improve, lyrics. Each is an icon button with a name; a tool the engine cannot run is drawn disabled with its reason. */
export function ComposerFieldTools({ tools, hasText, reasons, onTool }: {
  tools: readonly ComposerTool[];
  hasText: boolean;
  reasons?: Partial<Record<ComposerTool, string>>;
  onTool: (tool: ComposerTool) => void;
}) {
  if (tools.length === 0) return null;
  const meta: Record<ComposerTool, { label: string; Icon: typeof X }> = {
    clear: { label: i18n._({ id: "ui.Clear", message: "Clear" }), Icon: Eraser },
    improve: { label: i18n._({ id: "ui.Improve", message: "Improve" }), Icon: Wand2 },
    lyrics: { label: i18n._({ id: "ui.Write lyrics", message: "Write lyrics" }), Icon: Music },
  };
  return (
    <div data-slot="composer-field-tools" className="flex shrink-0 items-center gap-0.5">
      {tools.map((tool) => {
        const { label, Icon } = meta[tool];
        const reason = reasons?.[tool];
        const off = tool === "clear" ? !hasText : Boolean(reason);
        return (
          <button
            key={tool}
            type="button"
            data-tool={tool}
            aria-label={label}
            title={reason ?? label}
            aria-disabled={off || undefined}
            onClick={() => { if (!off) onTool(tool); }}
            className={cn("flex size-12 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50", off && "opacity-50")}
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/** Wraps the parts that change with the mode. The slot row opens and closes on the collapse tokens (a grid row from 0fr to 1fr), so the
 * field below it never jumps; the content cross-fades on the fade tokens, keyed by mode. Reduced motion zeroes both (tokens.css). */
export function ComposerModeZone({ modeId, open, children, className }: { modeId: string; open: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="composer-mode-zone"
      data-open={open ? "true" : "false"}
      aria-hidden={open ? undefined : true}
      inert={open ? undefined : true}
      className={cn("grid transition-[grid-template-rows,opacity] duration-[var(--motion-collapse-in)] ease-[var(--motion-ease-out)]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 duration-[var(--motion-collapse-out)]", className)}
    >
      <div className="min-h-0 overflow-hidden">
        <div key={modeId} className="motion-fade">{children}</div>
      </div>
    </div>
  );
}
