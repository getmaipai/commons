"use client";

import { useId, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Loader2Icon, MoreHorizontalIcon } from "lucide-react";
import { cn } from "cn";
import { i18n } from "@/kit/i18n";
import { getIcon } from "@/kit/icons";
import { Button } from "@/kit/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/kit/ui/tooltip";

/** What a control starts, so the host can disable it with one reason while that kind of making is not ready. */
export type VideoPlayerStarts = "picture" | "video";

/** Which statuses a row action shows in. Defaults to `ready`. */
export type VideoPlayerActionWhen = Array<"draft" | "queued" | "generating" | "ready" | "failed" | "cancelled">;

/** A row action the host passes in `actionItems`. */
export interface VideoPlayerAction {
  label: string;
  /** A kit icon name ("pencil", "sparkles"). Drawn beside the label, or alone in the icons variant. */
  icon?: string;
  /** Named submenu in More. Such actions are never inline or overlay pills. */
  group?: string;
  key?: string;
  when?: VideoPlayerActionWhen;
  /** One plain line. Present means the action is disabled and says why. */
  disabledReason?: string;
  starts?: VideoPlayerStarts;
  /** `retake_from`: "Retake from {time}". The player draws it with the clip's current time, arms a marker on the scrub bar when it is chosen and
   * calls the player's `onRetakeFrom(timeSec)`. `{time}` in `label` becomes the m:ss time. Leave out for an ordinary action. */
  kind?: "retake_from";
  /** One calm line beside the action: what it keeps and how long it takes ("Keeps the opening. About 8 minutes."). While `disabledReason` is set, the reason takes its place. */
  note?: string;
  /** The action is running: a spinner, the button disabled and `aria-busy`. The note stays. */
  busy?: boolean;
  /** `start` puts it before the built-in actions (Download, Share, ...), `end` (default) after them. */
  placement?: "start" | "end";
  onSelect?: (timeSec?: number) => void;
}

/** The most actions one row draws (inline and in More together). */
export const VIDEO_PLAYER_ACTION_CAP = 24;

/** A row entry after the Element has merged its built-in actions with the host's. */
export interface RowAction {
  key: string;
  label: string;
  group?: string;
  icon: ReactNode;
  onSelect: () => void;
  disabledReason?: string;
  starts?: VideoPlayerStarts;
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** One calm line beside the button; the visible `disabledReason` takes its place while disabled. */
  note?: string;
  /** Running: spinner, disabled, `aria-busy`. */
  busy?: boolean;
  /** Draw `disabledReason` as visible text beside the button (it is a tooltip only otherwise). */
  reasonVisible?: boolean;
  /** A toggle's state (the retake marker is set). */
  pressed?: boolean;
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
  const noteId = useId();
  const iconOnly = icons && !action.alwaysLabelled;
  const line = action.reasonVisible && action.disabledReason ? action.disabledReason : action.note;
  const visibleReason = Boolean(action.reasonVisible && action.disabledReason);
  const button = (
    <Button
      type="button"
      variant={action.variant ?? "ghost"}
      size={iconOnly ? "icon-sm" : "sm"}
      disabled={Boolean(action.disabledReason) || Boolean(action.busy)}
      aria-label={iconOnly ? action.label : undefined}
      aria-busy={action.busy ? true : undefined}
      aria-pressed={action.pressed === undefined ? undefined : action.pressed}
      aria-describedby={line ? noteId : undefined}
      data-starts={action.starts}
      data-busy={action.busy ? "" : undefined}
      onClick={action.onSelect}
    >
      {action.busy ? <Loader2Icon aria-hidden className="motion-safe:animate-spin" /> : action.icon}
      {iconOnly ? null : action.label}
    </Button>
  );
  const drawn = iconOnly ? (
    <Reasoned reason={visibleReason ? undefined : action.disabledReason}>
      {action.disabledReason ? button : (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>{action.label}</TooltipContent>
        </Tooltip>
      )}
    </Reasoned>
  ) : <Reasoned reason={visibleReason ? undefined : action.disabledReason}>{button}</Reasoned>;
  if (!line) return drawn;
  return (
    <div data-slot="video-player-action-item" className="flex w-full flex-wrap items-center gap-x-3 gap-y-1">
      {drawn}
      <p id={noteId} data-slot="video-player-action-note" data-reason={visibleReason ? "" : undefined} className="text-muted-foreground min-w-0 flex-1 basis-48 text-xs">{line}</p>
    </div>
  );
}

function MoreActionItem({ action }: { action: RowAction }) {
  return (
    <DropdownMenuItem key={action.key} disabled={Boolean(action.disabledReason) || Boolean(action.busy)} data-starts={action.starts} title={action.disabledReason} onSelect={action.onSelect}>
      {action.busy ? <Loader2Icon aria-hidden className="motion-safe:animate-spin" /> : action.icon}
      <span className="flex flex-col">
        <span>{action.label}</span>
        {action.disabledReason ? <span className="text-muted-foreground text-xs">{action.disabledReason}</span> : action.note ? <span className="text-muted-foreground text-xs">{action.note}</span> : null}
      </span>
    </DropdownMenuItem>
  );
}

/** The glass the overlay pills sit on: the page background at 60% with a 10px blur, tokens only. */
export const OVERLAY_GLASS = "bg-[color-mix(in_oklab,var(--background)_60%,transparent)] backdrop-blur-[10px]";

function OverlayPill({ action }: { action: RowAction }) {
  const blocked = Boolean(action.disabledReason) || Boolean(action.busy);
  const hint = action.disabledReason ?? action.note;
  return (
    // eslint-disable-next-line jsx-a11y/role-supports-aria-props -- aria-description is ARIA 1.3 and the lint rule predates it; screen readers announce it
    <button
      type="button"
      data-slot="video-player-pill"
      data-busy={action.busy ? "" : undefined}
      data-starts={action.starts}
      aria-label={action.label}
      aria-disabled={blocked ? true : undefined}
      aria-busy={action.busy ? true : undefined}
      aria-pressed={action.pressed === undefined ? undefined : action.pressed}
      // The reason shows on hover (title) and is announced (aria-description); aria-disabled, not disabled, keeps the pill focusable so a keyboard user reaches it.
      title={hint}
      aria-description={hint}
      onClick={() => { if (!blocked) action.onSelect(); }}
      className={cn(
        OVERLAY_GLASS,
        "text-foreground border-border/60 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium outline-none sm:px-4",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-safe:transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
        blocked ? "cursor-not-allowed opacity-60" : "hover:bg-[color-mix(in_oklab,var(--background)_75%,transparent)]",
        action.pressed && "border-foreground/40",
      )}
    >
      {action.busy ? <Loader2Icon aria-hidden className="motion-safe:animate-spin" /> : action.icon}
      <span className={action.icon || action.busy ? "hidden sm:inline" : undefined}>{action.label}</span>
    </button>
  );
}

/**
 * The actions of a clip as floating glass pills at the top end of its picture (VideoPlayer `overlayActions`). They wrap and take at most 80%
 * of the picture's width. Each is a real button with a visible label; on a phone the label hides behind its icon and stays as the aria-label.
 * A `disabledReason` (or `note`) sits in `title` and `aria-description`. `slot` and `trailing` (Favorite) draw after the pills.
 */
export function OverlayPills({ actions, slot, trailing, className }: { actions: RowAction[]; slot?: ReactNode; trailing?: ReactNode; className?: string }) {
  const capped = actions.slice(0, VIDEO_PLAYER_ACTION_CAP);
  // VF-EDIT-04: an action with a `group` never draws as a pill; the groups open from one "More" pill as nested submenus (the same menu the row uses).
  const pills = capped.filter(action => !action.group);
  const grouped = capped.filter(action => Boolean(action.group));
  const entries: Array<{ group: string; actions: RowAction[] }> = [];
  for (const action of grouped) {
    const found = entries.find(entry => entry.group === action.group);
    if (found) found.actions.push(action); else entries.push({ group: action.group!, actions: [action] });
  }
  const more = i18n._({ id: "ui.More", message: "More" });
  return (
    <div data-slot="video-player-overlay-pills" className={cn("absolute end-3 top-12 z-10 flex max-w-[80%] flex-wrap justify-end gap-2", className)}>
      {pills.map(action => <OverlayPill key={action.key} action={action} />)}
      {entries.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" data-slot="video-player-pill" data-more="" aria-label={more} className={cn(OVERLAY_GLASS, "text-foreground border-border/60 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium outline-none sm:px-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0")}>
              <MoreHorizontalIcon aria-hidden />
              <span className="hidden sm:inline">{more}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {entries.map((entry, index) => (
              <DropdownMenuSub key={`group-${entry.group}-${index}`}>
                <DropdownMenuSubTrigger>{entry.group}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>{entry.actions.map(action => <MoreActionItem key={action.key} action={action} />)}</DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {slot}
      {trailing ? <span className={cn(OVERLAY_GLASS, "inline-flex items-center rounded-full")}>{trailing}</span> : null}
    </div>
  );
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
  className,
}: {
  actions: RowAction[];
  icons: boolean;
  inline?: number;
  moreLabel: string;
  slot?: ReactNode;
  trailing?: ReactNode;
  /** Extra classes on the row (VIDEO-UI-14: the hover reveal and the overlay alignment). */
  className?: string;
}) {
  const capped = actions.slice(0, VIDEO_PLAYER_ACTION_CAP);
  const ungrouped = capped.filter(action => !action.group);
  const limit = typeof inline === "number" ? Math.max(0, Math.min(VIDEO_PLAYER_ACTION_CAP, Math.floor(inline))) : capped.length;
  const effectiveLimit = Math.min(limit, ungrouped.length);
  const shown = ungrouped.slice(0, effectiveLimit);
  const more = capped.filter(action => Boolean(action.group) || ungrouped.indexOf(action) >= effectiveLimit);
  const menuEntries: Array<{ group?: string; actions: RowAction[] }> = [];
  const groups = new Map<string, RowAction[]>();
  for (const action of more) {
    if (!action.group) { menuEntries.push({ actions: [action] }); continue; }
    let grouped = groups.get(action.group);
    if (!grouped) { grouped = []; groups.set(action.group, grouped); menuEntries.push({ group: action.group, actions: grouped }); }
    grouped.push(action);
  }
  return (
    <TooltipProvider delayDuration={300}>
      <div data-slot="video-player-actions" data-variant={icons ? "icons" : "labelled"} className={cn(icons ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-2", className)}>
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
              {menuEntries.map((entry, index) => entry.group ? (
                <DropdownMenuSub key={`group-${entry.group}-${index}`}>
                  <DropdownMenuSubTrigger>{entry.group}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>{entry.actions.map(action => <MoreActionItem key={action.key} action={action} />)}</DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : <MoreActionItem key={entry.actions[0]!.key} action={entry.actions[0]!} />)}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {slot}
        {trailing ? <span className="ms-auto inline-flex">{trailing}</span> : null}
      </div>
    </TooltipProvider>
  );
}

/**
 * The scrub bar under a clip that offers "Retake from here": the played share, a thumb, and a marker at the armed time. It seeks the clip
 * by pointer and by Left, Right, Home and End (Shift for ten seconds), so the person can pick the point before choosing the action.
 */
export function RetakeBar({
  time,
  duration,
  armedAt,
  seekLabel,
  valueText,
  pointText,
  clearLabel,
  clearText,
  onSeek,
  onClear,
}: {
  time: number;
  duration: number;
  /** The armed time in seconds; the marker and the point line draw only while it is set. */
  armedAt: number | null;
  seekLabel: string;
  valueText: string;
  /** "Retake point 0:07", visible beside the bar while armed. */
  pointText: string;
  clearLabel: string;
  clearText: string;
  onSeek: (sec: number) => void;
  onClear: () => void;
}) {
  const known = Number.isFinite(duration) && duration > 0;
  const share = (sec: number) => (known ? Math.min(100, Math.max(0, (sec / duration) * 100)) : 0);
  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!known) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    onSeek(Math.min(duration, Math.max(0, ((event.clientX - box.left) / box.width) * duration)));
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!known) return;
    const step = event.shiftKey ? 10 : 1;
    const next = event.key === "ArrowRight" || event.key === "ArrowUp" ? time + step : event.key === "ArrowLeft" || event.key === "ArrowDown" ? time - step : event.key === "Home" ? 0 : event.key === "End" ? duration : null;
    if (next === null) return;
    event.preventDefault();
    onSeek(Math.min(duration, Math.max(0, next)));
  };
  const dragging = useRef(false);
  return (
    <div data-slot="video-player-retake" data-armed={armedAt !== null ? "" : undefined} className="flex flex-col gap-1 px-6 pt-2">
      <div
        role="slider"
        tabIndex={0}
        aria-label={seekLabel}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={known ? Math.round(duration) : 0}
        aria-valuenow={known ? Math.round(time) : 0}
        aria-valuetext={valueText}
        aria-disabled={known ? undefined : true}
        data-slot="video-player-scrub"
        onKeyDown={onKey}
        onPointerDown={event => {
          dragging.current = true;
          try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* capture is a nicety */ }
          seekFromPointer(event);
        }}
        onPointerMove={event => { if (dragging.current) seekFromPointer(event); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        className="relative flex h-12 w-full cursor-pointer touch-none items-center rounded-full focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <div className="bg-muted relative h-2 w-full rounded-full">
          <div data-slot="video-player-scrub-fill" className="bg-primary absolute inset-y-0 start-0 rounded-full" style={{ width: `${share(time)}%` }} />
          {armedAt !== null && known ? (
            <span
              data-slot="video-player-retake-marker"
              aria-hidden
              className="bg-foreground absolute top-1/2 h-6 w-1 -translate-y-1/2 rounded-full motion-safe:transition-[inset-inline-start] motion-safe:duration-150"
              style={{ insetInlineStart: `calc(${share(armedAt)}% - 0.125rem)` }}
            />
          ) : null}
          <span data-slot="video-player-scrub-thumb" aria-hidden className="border-primary bg-background absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 shadow-sm" style={{ insetInlineStart: `calc(${share(time)}% - 0.5rem)` }} />
        </div>
      </div>
      {armedAt !== null ? (
        <div className="flex items-center justify-between gap-3">
          <p data-slot="video-player-retake-point" role="status" className="text-foreground text-sm tabular-nums">{pointText}</p>
          <Button type="button" variant="ghost" size="sm" aria-label={clearLabel} onClick={onClear}>{clearText}</Button>
        </div>
      ) : null}
    </div>
  );
}
