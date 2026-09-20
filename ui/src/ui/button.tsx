// Copied by the shadcn registry for MaiPai Stack dashboard.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/kit/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // 48px is the kit's hard minimum touch target (docs/UI.md); "default",
      // "lg" and "icon" clear it directly, with text-base to also clear the
      // 16px type floor. "xs"/"sm"/"icon-xs"/"icon-sm"/"icon-lg" stay
      // visually compact (desktop/mouse-only, never the only way to reach
      // an action a touch or TV surface must also use) but keep the same
      // 48px hit area with a transparent pseudo-element, the technique the
      // accessibility audit established for Switch's track: the target and
      // the artwork are different things.
      size: {
        default: "h-12 px-4 py-2 text-base has-[>svg]:px-3",
        // Deliberate type-floor exception (docs/UI.md): a fixed h-6 (24px)
        // button too short for 16px text - a caller choosing "xs" over
        // "default" (already text-base) is asking for the compact option
        // on purpose.
        xs: "relative h-6 gap-1 px-2 text-xs before:absolute before:-inset-3 before:content-[''] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "relative h-8 gap-1.5 px-3 before:absolute before:-inset-2 before:content-[''] has-[>svg]:px-2.5",
        lg: "h-14 px-6 text-lg has-[>svg]:px-4",
        icon: "size-12",
        "icon-xs": "relative size-6 before:absolute before:-inset-3 before:content-[''] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "relative size-8 before:absolute before:-inset-2 before:content-['']",
        "icon-lg": "relative size-10 before:absolute before:-inset-1 before:content-['']",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
