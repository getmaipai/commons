/**
 * Source: https://github.com/shadcnblocks/kibo/blob/3d63cdb15b79d972e3dc38a10997987672f9b263/packages/status/index.tsx
 * Upstream commit: 3d63cdb15b79d972e3dc38a10997987672f9b263
 * License: MIT, Copyright (c) 2023 to Present shadcnblocks
 * modified:
 * - Use kit Badge and cn imports instead of Kibo's component and helper paths.
 * - Replace raw palette colors with the kit's themed hue and semantic tokens.
 * - Keep the upstream ping-dot behavior and status label API.
 * - Add an opt-out for ping animation and use the attention tint for degraded state.
 */
import type { ComponentProps, HTMLAttributes } from "react";
import { Badge } from "@/kit/ui/badge";
import { cn } from "@/kit/utils";

export type StatusKind = "online" | "offline" | "maintenance" | "degraded";

export type StatusProps = ComponentProps<typeof Badge> & {
  status: StatusKind;
};

const indicatorColors: Record<StatusKind, string> = {
  online: "bg-[var(--hue-green)]",
  offline: "bg-destructive",
  maintenance: "bg-primary",
  degraded: "bg-[var(--tint-attention-fg)]",
};

const statusLabels: Record<StatusKind, string> = {
  online: "Online",
  offline: "Offline",
  maintenance: "Maintenance",
  degraded: "Degraded",
};

const statusLabelClasses: Record<StatusKind, string> = {
  online: "group-[.online]:inline",
  offline: "group-[.offline]:inline",
  maintenance: "group-[.maintenance]:inline",
  degraded: "group-[.degraded]:inline",
};

function Status({ className, status, ...props }: StatusProps) {
  return (
    <Badge
      className={cn("group flex items-center gap-2", status, className)}
      data-status={status}
      variant="secondary"
      {...props}
    />
  );
}

type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement> & {
  status?: StatusKind;
  ping?: boolean;
  /** Render inline with nearby sentence text instead of taking its own line. */
  inline?: boolean;
};

function StatusIndicator({ className, status, ping = true, inline = false, ...props }: StatusIndicatorProps) {
  const colors = status ? indicatorColors[status] : undefined;

  return (
    <span
      aria-hidden="true"
      className={cn(inline ? "relative inline-flex size-2 shrink-0" : "relative flex size-2 shrink-0", className)}
      {...props}
    >
      {ping && (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-75",
            colors ?? "group-[.online]:bg-[var(--hue-green)] group-[.offline]:bg-destructive group-[.maintenance]:bg-primary group-[.degraded]:bg-[var(--tint-attention-fg)]",
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          colors ?? "group-[.online]:bg-[var(--hue-green)] group-[.offline]:bg-destructive group-[.maintenance]:bg-primary group-[.degraded]:bg-[var(--tint-attention-fg)]",
        )}
      />
    </span>
  );
}

type StatusLabelProps = HTMLAttributes<HTMLSpanElement>;

function StatusLabel({ className, children, ...props }: StatusLabelProps) {
  return (
    <span className={cn("text-muted-foreground", className)} {...props}>
      {children ?? (
        <>
          {(Object.keys(statusLabels) as StatusKind[]).map((status) => (
            <span key={status} className={cn("hidden", statusLabelClasses[status])}>
              {statusLabels[status]}
            </span>
          ))}
        </>
      )}
    </span>
  );
}

export { Status, StatusIndicator, StatusLabel };
