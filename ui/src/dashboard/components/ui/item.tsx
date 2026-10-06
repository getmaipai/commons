import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"
import { Separator } from "./separator"

// The row size, so the text parts of a `size="setting"` row restyle
// themselves and every other row keeps its class strings byte for byte.
const ItemSizeContext = React.createContext<string | undefined>(undefined)
const useIsSetting = () => React.useContext(ItemSizeContext) === "setting"

function ItemGroup({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & {
  /** "card" draws the settings card: rounded, 1 px border, card fill,
   * rows flush with no gap. Unset keeps the plain stack. */
  variant?: "card"
}) {
  return (
    <div
      // The card holds inset separators and a collapsible fold, which are
      // not list items, so a card is a plain group; the unset stack keeps
      // role="list". A caller's own role (in props) still wins.
      role={variant === "card" ? undefined : "list"}
      data-slot="item-group"
      data-variant={variant}
      className={cn(
        "group/item-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2",
        variant === "card" &&
          "gap-0 overflow-hidden rounded-[var(--settings-card-radius)] border border-settings-card-border bg-settings-card",
        className
      )}
      {...props}
    />
  )
}

function ItemSeparator({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof Separator> & {
  /** "inset" is the settings row divider: 16 px in from each edge, in
   * the card border color. Unset keeps the full-width rule. */
  variant?: "inset"
}) {
  return (
    <Separator
      data-slot="item-separator"
      data-variant={variant}
      orientation="horizontal"
      className={cn(
        variant === "inset"
          ? "mx-4 my-0 bg-settings-card-border data-horizontal:w-[calc(100%-2rem)]"
          : "my-2",
        className
      )}
      {...props}
    />
  )
}

const itemVariants = cva(
  "group/item flex w-full flex-wrap items-center rounded-lg border text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-muted",
  {
    variants: {
      variant: {
        default: "border-transparent",
        outline: "border-border",
        muted: "border-transparent bg-muted/50",
      },
      size: {
        default: "gap-2.5 px-3 py-2.5",
        sm: "gap-2.5 px-3 py-2.5",
        xs: "gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0",
        setting:
          "min-h-[60px] flex-nowrap gap-4 rounded-none px-4 py-3 [a]:hover:bg-settings-fill/50",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Item({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof itemVariants>) {
  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(itemVariants({ variant, size, className })),
      },
      props
    ),
    render,
    state: {
      slot: "item",
      variant,
      size,
    },
  })
  return (
    <ItemSizeContext.Provider value={size ?? undefined}>
      {element}
    </ItemSizeContext.Provider>
  )
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "[&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  const setting = useIsSetting()
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none",
        setting && "max-w-(--settings-row-text-max) min-w-0 gap-0",
        className
      )}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  const setting = useIsSetting()
  return (
    <div
      data-slot="item-title"
      className={cn(
        "line-clamp-1 flex w-fit items-center gap-2 text-sm leading-snug font-medium underline-offset-4",
        setting && "leading-5 text-foreground",
        className
      )}
      {...props}
    />
  )
}

function ItemDescription({
  className,
  clamp = true,
  ...props
}: React.ComponentProps<"p"> & {
  /** false lets the helper text run to any number of lines (the shipped
   * two-line clamp cuts the three-line settings rows). */
  clamp?: boolean
}) {
  const setting = useIsSetting()
  return (
    <p
      data-slot="item-description"
      className={cn(
        clamp && "line-clamp-2",
        "text-left text-sm leading-normal font-normal text-muted-foreground group-data-[size=xs]/item:text-xs [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        setting && "text-[13px] leading-4 text-settings-helper",
        className
      )}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  const setting = useIsSetting()
  return (
    <div
      data-slot="item-actions"
      className={cn("flex items-center gap-2", setting && "ml-auto shrink-0", className)}
      {...props}
    />
  )
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-header"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-footer"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}
