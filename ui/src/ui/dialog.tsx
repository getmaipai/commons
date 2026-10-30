import * as React from "react"
import { cn } from "@/kit/utils"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/kit/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-background/70 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  variant = "default",
  size = "default",
  scroll = "none",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  // "flow" (KIT-3S-01) is the large rounded multi-step dialog of the
  // companion screens: it fills the phone screen and is a centred rounded
  // card from sm up. Its colours are the theme's tokens only. Its "xl" size
  // is the wide card (sm:max-w-7xl) for a screen that lays out three columns.
  variant?: "default" | "command" | "call" | "flow"
  // The command variant reads "lg" (the ChatGPT-proportioned search dialog).
  // The default variant reads "sm" and "xl" (RULE9-COMMONS-VARIANTS-01); its
  // "default" and "lg" stay sm:max-w-lg.
  size?: "sm" | "default" | "lg" | "xl"
  // "viewport" caps the height at the screen and scrolls the content.
  scroll?: "none" | "viewport"
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          variant === "call"
            ? "top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-transparent p-0 shadow-none sm:top-[50%] sm:left-[50%] sm:h-auto sm:w-auto sm:max-w-xs sm:translate-x-[-50%] sm:translate-y-[-50%]"
            : variant === "flow"
              ? cn("top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-6 overflow-y-auto rounded-none border-0 bg-background p-5 shadow-lg sm:top-[50%] sm:left-[50%] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl sm:border sm:p-8 [&_[data-slot=dialog-header]]:pr-12", size === "xl" ? "sm:max-w-7xl" : "sm:max-w-5xl")
            : variant === "command"
              ? cn(
                "flex flex-col gap-0 border-0 bg-transparent p-0 shadow-none",
                size === "lg" ? "sm:max-w-3xl" : "sm:max-w-sm"
              )
              : "grid gap-4 rounded-lg border bg-background p-6 shadow-lg sm:max-w-lg",
          variant === "default" && size === "sm" && "sm:max-w-sm",
          variant === "default" && size === "xl" && "sm:max-w-2xl",
          scroll === "viewport" && "max-h-screen overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          // A plain `<DialogPrimitive.Close>` with an icon and no explicit
          // size has no real touch target; routing it through the kit's
          // own Button (already carrying the 48px hit-area extension on
          // "icon-sm") is the docs/UI.md fix rather than a second copy of
          // that geometry here.
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className={variant === "flow" ? "absolute top-4 right-4 sm:top-6 sm:right-6" : "absolute top-2 right-2"}
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  align = "end",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
  // "between" (KIT-3S-01) puts the first and last children at the two ends of
  // one row (Back on the left, a note or Continue on the right).
  align?: "end" | "between"
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        align === "between"
          ? "flex flex-row items-center justify-between gap-2"
          : "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title> & {
  // "xl" (KIT-3S-01) is the big heading of a flow dialog.
  size?: "default" | "xl"
}) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(size === "xl" ? "text-3xl leading-tight font-bold" : "text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

// KIT-3S-01: the body of a flow dialog. "two" puts the sections in two
// columns ("three" for the wide flow dialog) from lg up and stacks them on a phone.
function DialogBody({
  className,
  columns = "one",
  ...props
}: React.ComponentProps<"div"> & { columns?: "one" | "two" | "three" }) {
  return (
    <div
      data-slot="dialog-body"
      data-columns={columns}
      className={cn(
        "grid min-h-0 grid-cols-1 gap-6",
        columns === "two" && "lg:grid-cols-2 lg:gap-8",
        columns === "three" && "lg:grid-cols-3 lg:gap-8",
        className
      )}
      {...props}
    />
  )
}

// KIT-3S-01: one titled block of a flow dialog: an optional icon and heading
// on the left, an optional muted aside (a count, a "Select All" link) on the
// right, then the content.
function DialogSection({
  className,
  title,
  icon,
  aside,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode
  icon?: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <section
      data-slot="dialog-section"
      className={cn("flex min-w-0 flex-col gap-3", className)}
      {...props}
    >
      <div data-slot="dialog-section-header" className="flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-base font-semibold [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
          {icon}
          <span className="truncate">{title}</span>
        </h3>
        {aside ? <div data-slot="dialog-section-aside" className="shrink-0 text-sm text-muted-foreground">{aside}</div> : null}
      </div>
      {children}
    </section>
  )
}

export {
  DialogBody,
  DialogSection,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
