

import * as React from "react"
import { i18n } from "@/kit/i18n";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "cn-dialog-overlay fixed inset-0 isolate z-50 bg-background/40 motion-fade supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

const DIALOG_SIZE = {
  default: "",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
} as const

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "default",
  scroll = "none",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  // Additive (RULE9-COMMONS-VARIANTS-01): widest the dialog may grow at the
  // sm breakpoint. "default" keeps the original sm:max-w-sm.
  size?: "default" | "lg" | "xl"
  // "viewport" caps the height at the screen and scrolls the content.
  scroll?: "none" | "viewport"
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "cn-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 motion-rise outline-none sm:max-w-sm max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[90dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:motion-sheet-bottom max-sm:before:mx-auto max-sm:before:-mt-1 max-sm:before:h-1.5 max-sm:before:w-10 max-sm:before:rounded-full max-sm:before:bg-muted max-sm:before:content-['']",
          DIALOG_SIZE[size],
          scroll === "viewport" && "max-h-screen overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="cn-dialog-close absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">{i18n._({ id: "ui.Close", message: "Close" })}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("cn-dialog-header flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "cn-dialog-footer -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          {i18n._({ id: "ui.Close", message: "Close" })}
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "cn-dialog-title text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "cn-dialog-description text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
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
