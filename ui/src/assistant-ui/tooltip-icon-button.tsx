"use client";

import { type ComponentPropsWithRef, forwardRef } from "react";
import { Slot } from "radix-ui";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/kit/ui/tooltip";
import { Button } from "@/kit/ui/button";
import { cn } from "@/kit/utils";

export type TooltipIconButtonProps = ComponentPropsWithRef<typeof Button> & {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
  /** The 48px tappable area (an invisible pseudo-element around the
   * `size-6` button). On by default, which is today's markup; pass
   * `false` to opt out, never by className. */
  hitArea48?: boolean;
};

export const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>(({ children, tooltip, side = "bottom", hitArea48 = true, className, ...rest }, ref) => {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            {...rest}
            className={cn(
              // `relative before:-inset-3`: the touch-target floor
              // (docs/UI.md, BACKLOG.md lane 8 item 1, 2026-09-13) - this
              // component's own default box is `size-6` (24px), which a
              // live measurement caught unfixed across the message
              // action bar (Copy, Refresh, More, Listen, Remember this -
              // chatActionBar.tsx and thread.aui.tsx, none had a size
              // override). `-inset-3` (12px) on 24px reaches 48px; a
              // caller that overrides to a different size (the composer
              // buttons' own `size-9` + `-inset-1.5`) supplies its own
              // pseudo classes after this one, which win the merge.
              hitArea48
                ? "aui-button-icon relative size-6 p-1 before:absolute before:-inset-3 before:content-[''] active:scale-90"
                : "aui-button-icon size-6 p-1 active:scale-90",
              className,
            )}
            ref={ref}
          >
            <Slot.Slottable>{children}</Slot.Slottable>
            <span className="aui-sr-only sr-only">{tooltip}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

TooltipIconButton.displayName = "TooltipIconButton";
