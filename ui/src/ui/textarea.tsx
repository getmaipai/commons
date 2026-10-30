import * as React from "react"
import { cn } from "@/kit/utils"

function Textarea({
  className,
  showCount = false,
  shape = "default",
  maxRows,
  style,
  ...props
}: React.ComponentProps<"textarea"> & {
  /** Caps how tall the box grows: past this many lines it scrolls inside itself instead of lengthening the page. */
  maxRows?: number

  /** "rounded" draws the large soft corner of the companion flow (KIT-3S-01). Default is unchanged. */
  shape?: "default" | "rounded"
  /** Draws "n/max" under the field while `maxLength` is set and the value
   * is controlled. Off by default; the field is unchanged without it. */
  showCount?: boolean
}) {
  const field = (
    <textarea
      data-slot="textarea"
      data-shape={shape === "default" ? undefined : shape}
      className={cn(
        // 16px body text at every width (docs/UI.md's floor); no `md:` demotion.
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        shape === "rounded" && "rounded-2xl px-4 py-3",
        maxRows !== undefined && "max-h-[calc(var(--textarea-max-rows)*1lh+1.5rem)] overflow-y-auto",
        className
      )}
      style={maxRows !== undefined ? ({ "--textarea-max-rows": maxRows, ...style } as React.CSSProperties) : style}
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
