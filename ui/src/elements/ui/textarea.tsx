import * as React from "react"
import { cn } from "cn"

// `maxRows` caps how tall the box grows: past it the box scrolls inside itself instead of lengthening the page.
function Textarea({ className, maxRows, style, ...props }: React.ComponentProps<"textarea"> & { maxRows?: number }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        maxRows !== undefined && "max-h-[calc(var(--textarea-max-rows)*1lh+1rem)] overflow-y-auto",
        className
      )}
      style={maxRows !== undefined ? ({ "--textarea-max-rows": maxRows, ...style } as React.CSSProperties) : style}
      {...props}
    />
  )
}

export { Textarea }
