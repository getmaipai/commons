// Copied by the shadcn registry for MaiPai Stack dashboard.
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/kit/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        // gap-4, not gap-2: TabsTrigger's own 48px touch-target hit-area
        // extension (`before:-inset-*-3.5`, 14px) reaches past a smaller
        // gap into TabsContent's own top edge - a tap on the first few
        // pixels of a tab's content could activate the trigger instead.
        // 16px clears the 14px extension with a real margin.
        "group/tabs flex gap-4 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      // Deliberate touch-target-floor exception (docs/UI.md): Radix's own
      // RovingFocusGroup puts a real, roving `tabIndex` on this LIST
      // wrapper itself, not just on each trigger, so a touch-target sweep
      // catches the wrapper as if it were its own click target. It isn't
      // one: its two real targets are the TabsTrigger buttons inside, each
      // already cleared to 48px on its own.
      data-touch-target-exempt
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // docs/UI.md's 48px touch-target floor: a transparent `::before`
        // extends the real tappable area past the compact painted trigger
        // rather than growing the tab bar itself. Only the CROSS axis
        // (horizontal tabs sit side by side, so only Y needs the credit;
        // vertical tabs stack top to bottom, so only X would) - extending
        // both axes would overlap into the next trigger, since the default
        // TabsList variant has no gap between triggers.
        //
        // text-muted-foreground, not shadcn's own text-foreground/60: an
        // inactive trigger's opacity-reduced foreground measured only
        // 4.42:1 against the approved light theme's own --muted (Home
        // step 5a, 2026-09-20), under WCAG AA's 4.5:1 floor - the same
        // class of bug as sidebar.tsx's own SidebarGroupLabel opacity.
        // --muted-foreground is a real, already-audited token for exactly
        // this "quiet secondary text" role (5.4:1 against --muted) and
        // matches what this component's own dark mode already does one
        // line down, so light and dark now share one rule instead of two.
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all before:absolute before:content-[''] group-data-[orientation=horizontal]/tabs:before:-inset-y-3.5 group-data-[orientation=vertical]/tabs:before:-inset-x-3.5 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
