"use client";

import { useId, useState, type ReactNode } from "react";
import { MoreHorizontalIcon } from "lucide-react";
import { getIcon } from "@/kit/icons";
import { Button } from "@/kit/ui/button";
import { Checkbox } from "@/kit/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import { Input } from "@/kit/ui/input";
import { Label } from "@/kit/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/kit/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/kit/ui/tooltip";

/** What a control starts, so the host can disable it with one reason while that kind of making is not ready. */
export type VideoPlayerStarts = "picture" | "video";

/** One input of a `sheet` action. `clips` is a pick-several list the host fills with `options` (the person's clips). */
export interface VideoPlayerSheetField {
  name: string;
  label: string;
  kind: "number" | "text" | "clips";
  /** `clips` only: what can be picked. The result lists the picked values in the order they were ticked. */
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  defaultValue?: string | number | string[];
  required?: boolean;
}

/** The small form an action opens (Trim, Join, Mix need inputs). */
export interface VideoPlayerSheet {
  title: string;
  submitLabel: string;
  description?: string;
  fields: VideoPlayerSheetField[];
}

export type VideoPlayerSheetValues = Record<string, string | number | string[]>;

/** Which statuses a row action shows in. Defaults to `ready`. */
export type VideoPlayerActionWhen = Array<"draft" | "queued" | "generating" | "ready" | "failed" | "cancelled">;

/** A row action the host passes in `actionItems`. */
export interface VideoPlayerAction {
  label: string;
  /** A kit icon name ("pencil", "sparkles"). Drawn beside the label, or alone in the icons variant. */
  icon?: string;
  key?: string;
  when?: VideoPlayerActionWhen;
  /** One plain line. Present means the action is disabled and says why. */
  disabledReason?: string;
  starts?: VideoPlayerStarts;
  /** `start` puts it before the built-in actions (Download, Share, ...), `end` (default) after them. */
  placement?: "start" | "end";
  onSelect?: () => void;
  /** K7: the action opens this form instead of running at once; `onSubmit` gets the values. */
  sheet?: VideoPlayerSheet;
  onSubmit?: (values: VideoPlayerSheetValues) => void;
}

/** The most actions one row draws (inline and in More together). */
export const VIDEO_PLAYER_ACTION_CAP = 8;

/** A row entry after the Element has merged its built-in actions with the host's. */
export interface RowAction {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabledReason?: string;
  starts?: VideoPlayerStarts;
  variant?: "default" | "outline" | "ghost";
  /** Always drawn as a labelled button, even in the icons variant (the draft's main answer). */
  alwaysLabelled?: boolean;
}

export function iconFor(name: string | undefined): ReactNode {
  if (!name) return null;
  const Icon = getIcon(name);
  return <Icon aria-hidden />;
}

function Reasoned({ reason, children }: { reason?: string; children: ReactNode }) {
  if (!reason) return <>{children}</>;
  // A disabled button gets no pointer or focus, so the reason hangs on a focusable wrapper.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a disabled button takes no focus, so the wrapper carries the reason for keyboard users */}
        <span tabIndex={0} className="inline-flex rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">{children}</span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

function ActionButton({ action, icons }: { action: RowAction; icons: boolean }) {
  const iconOnly = icons && !action.alwaysLabelled;
  const button = (
    <Button
      type="button"
      variant={action.variant ?? "ghost"}
      size={iconOnly ? "icon-sm" : "sm"}
      disabled={Boolean(action.disabledReason)}
      aria-label={iconOnly ? action.label : undefined}
      data-starts={action.starts}
      onClick={action.onSelect}
    >
      {action.icon}
      {iconOnly ? null : action.label}
    </Button>
  );
  if (iconOnly) {
    return (
      <Reasoned reason={action.disabledReason}>
        {action.disabledReason ? button : (
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        )}
      </Reasoned>
    );
  }
  return <Reasoned reason={action.disabledReason}>{button}</Reasoned>;
}

/**
 * The row of actions under a clip. `inline` is how many draw as buttons; the rest go behind a More menu
 * (never more than VIDEO_PLAYER_ACTION_CAP in all). `trailing` (the Favorite toggle) always stays outside the menu.
 */
export function ActionRow({
  actions,
  icons,
  inline,
  moreLabel,
  slot,
  trailing,
}: {
  actions: RowAction[];
  icons: boolean;
  inline?: number;
  moreLabel: string;
  slot?: ReactNode;
  trailing?: ReactNode;
}) {
  const capped = actions.slice(0, VIDEO_PLAYER_ACTION_CAP);
  const limit = typeof inline === "number" ? Math.max(0, Math.min(VIDEO_PLAYER_ACTION_CAP, Math.floor(inline))) : capped.length;
  const shown = capped.length > limit ? capped.slice(0, limit) : capped;
  const more = capped.length > limit ? capped.slice(limit) : [];
  return (
    <TooltipProvider delayDuration={300}>
      <div data-slot="video-player-actions" data-variant={icons ? "icons" : "labelled"} className={icons ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-2"}>
        {shown.map(action => <ActionButton key={action.key} action={action} icons={icons} />)}
        {more.length > 0 ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={moreLabel}>
                    <MoreHorizontalIcon aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>{moreLabel}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              {more.map(action => (
                <DropdownMenuItem key={action.key} disabled={Boolean(action.disabledReason)} data-starts={action.starts} title={action.disabledReason} onSelect={action.onSelect}>
                  {action.icon}
                  <span className="flex flex-col">
                    <span>{action.label}</span>
                    {action.disabledReason ? <span className="text-muted-foreground text-xs">{action.disabledReason}</span> : null}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {slot}
        {trailing ? <span className="ms-auto inline-flex">{trailing}</span> : null}
      </div>
    </TooltipProvider>
  );
}

function initialValue(field: VideoPlayerSheetField): string | number | string[] {
  if (field.defaultValue !== undefined) return field.defaultValue;
  return field.kind === "clips" ? [] : "";
}

/** The K7 form: a `Sheet` with one control per field. Submit is blocked, with a plain line, until required fields are filled and numbers are in range. */
export function ActionSheet({ sheet, onSubmit, onClose }: { sheet: VideoPlayerSheet; onSubmit: (values: VideoPlayerSheetValues) => void; onClose: () => void }) {
  const base = useId();
  const [values, setValues] = useState<Record<string, string | number | string[]>>(() => Object.fromEntries(sheet.fields.map(field => [field.name, initialValue(field)])));
  const [problem, setProblem] = useState<string | null>(null);

  function submit() {
    const out: VideoPlayerSheetValues = {};
    for (const field of sheet.fields) {
      const raw = values[field.name];
      if (field.kind === "clips") {
        const picked = Array.isArray(raw) ? raw : [];
        if (field.required && picked.length === 0) return setProblem(`Pick at least one for ${field.label}.`);
        out[field.name] = picked;
      } else if (field.kind === "number") {
        const text = String(raw ?? "").trim();
        if (!text) {
          if (field.required) return setProblem(`Enter a number for ${field.label}.`);
          continue;
        }
        const n = Number(text);
        if (!Number.isFinite(n)) return setProblem(`${field.label} needs a number.`);
        if (typeof field.min === "number" && n < field.min) return setProblem(`${field.label} must be at least ${field.min}.`);
        if (typeof field.max === "number" && n > field.max) return setProblem(`${field.label} must be at most ${field.max}.`);
        out[field.name] = n;
      } else {
        const text = String(raw ?? "").trim();
        if (!text && field.required) return setProblem(`Fill in ${field.label}.`);
        out[field.name] = text;
      }
    }
    setProblem(null);
    onSubmit(out);
  }

  return (
    <Sheet open onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent data-slot="video-player-sheet" className="gap-0">
        <form noValidate className="flex h-full flex-col" onSubmit={event => { event.preventDefault(); submit(); }}>
          <SheetHeader>
            <SheetTitle>{sheet.title}</SheetTitle>
            {sheet.description ? <SheetDescription>{sheet.description}</SheetDescription> : <SheetDescription className="sr-only">{sheet.title}</SheetDescription>}
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {sheet.fields.map(field => {
              const id = `${base}-${field.name}`;
              if (field.kind === "clips") {
                const picked = Array.isArray(values[field.name]) ? (values[field.name] as string[]) : [];
                return (
                  <fieldset key={field.name} className="flex flex-col gap-2">
                    <legend className="mb-1 text-sm font-medium">{field.label}</legend>
                    {(field.options ?? []).length === 0 ? <p className="text-muted-foreground text-sm">Nothing to pick yet.</p> : null}
                    {(field.options ?? []).map(option => {
                      const optionId = `${id}-${option.value}`;
                      const index = picked.indexOf(option.value);
                      return (
                        <div key={option.value} className="flex items-center gap-3">
                          <Checkbox
                            id={optionId}
                            checked={index >= 0}
                            onCheckedChange={checked => setValues(current => {
                              const list = Array.isArray(current[field.name]) ? (current[field.name] as string[]) : [];
                              return { ...current, [field.name]: checked === true ? [...list.filter(v => v !== option.value), option.value] : list.filter(v => v !== option.value) };
                            })}
                          />
                          <Label htmlFor={optionId} className="flex-1 text-sm font-normal">{option.label}</Label>
                          {index >= 0 ? <span className="text-muted-foreground text-xs tabular-nums">{index + 1}</span> : null}
                        </div>
                      );
                    })}
                  </fieldset>
                );
              }
              return (
                <div key={field.name} className="flex flex-col gap-2">
                  <Label htmlFor={id}>{field.label}</Label>
                  <Input
                    id={id}
                    type={field.kind === "number" ? "number" : "text"}
                    inputMode={field.kind === "number" ? "decimal" : undefined}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={String(values[field.name] ?? "")}
                    onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))}
                  />
                </div>
              );
            })}
            {problem ? <p role="alert" className="text-destructive text-sm">{problem}</p> : null}
          </div>
          <SheetFooter>
            <Button type="submit">{sheet.submitLabel}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
