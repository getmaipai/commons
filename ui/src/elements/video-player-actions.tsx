"use client";

import type { ReactNode } from "react";
import { MoreHorizontalIcon } from "lucide-react";
import { cn } from "cn";
import { getIcon } from "@/kit/icons";
import { Button } from "@/kit/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
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
  key?: string;
  when?: VideoPlayerActionWhen;
  /** One plain line. Present means the action is disabled and says why. */
  disabledReason?: string;
  starts?: VideoPlayerStarts;
  /** `start` puts it before the built-in actions (Download, Share, ...), `end` (default) after them. */
  placement?: "start" | "end";
  onSelect?: () => void;
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
  const limit = typeof inline === "number" ? Math.max(0, Math.min(VIDEO_PLAYER_ACTION_CAP, Math.floor(inline))) : capped.length;
  const shown = capped.length > limit ? capped.slice(0, limit) : capped;
  const more = capped.length > limit ? capped.slice(limit) : [];
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
