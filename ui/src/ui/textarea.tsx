import * as React from "react"
import { cn } from "@/kit/utils"

function Textarea({
  className,
  showCount = false,
  ...props
}: React.ComponentProps<"textarea"> & {
  /** Draws "n/max" under the field while `maxLength` is set and the value
   * is controlled. Off by default; the field is unchanged without it. */
  showCount?: boolean
}) {
  const field = (
    <textarea
      data-slot="textarea"
      className={cn(
        // 16px body text at every width (docs/UI.md's floor); no `md:` demotion.
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
  if (!showCount || props.maxLength === undefined || typeof props.value !== "string") return field
  return (
    <div data-slot="textarea-count-root" className="flex w-full flex-col gap-1">
      {field}
      <span data-slot="textarea-count" aria-hidden className="text-muted-foreground self-end text-xs tabular-nums">
        {props.value.length}/{props.maxLength}
      </span>
    </div>
  )
}

export { Textarea }
