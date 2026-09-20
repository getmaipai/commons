// Copied by the shadcn registry for MaiPai Stack dashboard.
import * as React from "react"
import { cn } from "@/kit/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // h-12/text-base at every width: docs/UI.md's 48px target and 16px
        // body-text floors apply on phone AND desktop, so there is no
        // `md:` demotion to a smaller size the way the unmodified generated
        // component would ship.
        "h-12 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
