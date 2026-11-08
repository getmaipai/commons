// Copied by the shadcn registry for MaiPai Stack dashboard.
import { cn } from "@/kit/utils"

function Skeleton({ className, animation = "pulse", shape = "default", tone = "accent", ...props }: React.ComponentProps<"div"> & {
  animation?: "pulse" | "shimmer"
  shape?: "default" | "tile" | "row" | "line"
  tone?: "accent" | "surface"
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        animation === "pulse" ? "animate-pulse" : "shimmer motion-reduce:animate-none",
        shape === "default" ? "rounded-md" : shape === "tile" ? "aspect-square rounded-[var(--radius-card)]" : shape === "row" ? "h-[76px] rounded-[var(--radius-thumb)] w-full" : "h-4 rounded-full",
        tone === "accent" ? "bg-accent" : "bg-[var(--surface-2)]",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
