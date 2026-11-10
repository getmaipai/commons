// Copied by the shadcn registry for MaiPai Stack dashboard.
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const toastKind = (ink: string): string =>
  `!border-[var(${ink})] !bg-[color-mix(in_srgb,var(${ink})_8%,var(--surface-2))] [&_[data-icon]]:text-[var(${ink})]`

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          // STATUS-TOAST-01: a toast carries the same kind colors as the StatusCard (done teal, attention amber, problem red, info blue) so a failure that has no card slot still reads as one.
          success: toastKind("--status-done-ink"),
          warning: toastKind("--status-attention-ink"),
          error: toastKind("--tint-problem-border"),
          info: toastKind("--tint-info-border"),
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
