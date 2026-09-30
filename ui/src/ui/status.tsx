/**
 * Source: https://github.com/shadcnblocks/kibo/blob/3d63cdb15b79d972e3dc38a10997987672f9b263/packages/status/index.tsx
 * Upstream commit: 3d63cdb15b79d972e3dc38a10997987672f9b263
 * License: MIT, Copyright (c) 2023 to Present shadcnblocks
 * modified:
 * - Use kit Badge and cn imports instead of Kibo's component and helper paths.
 * - Replace raw palette colors with the kit's themed hue and semantic tokens.
 * - Keep the upstream ping-dot behavior and status label API.
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
  degraded: "bg-[var(--hue-yellow)]",
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
};

function StatusIndicator({ className, status, ...props }: StatusIndicatorProps) {
  const colors = status ? indicatorColors[status] : undefined;

  return (
    <span
      aria-hidden="true"
      className={cn("relative flex size-2 shrink-0", className)}
      {...props}
    >
      <span
        className={cn(
          "absolute inline-flex size-full animate-ping rounded-full opacity-75",
          colors ?? "group-[.online]:bg-[var(--hue-green)] group-[.offline]:bg-destructive group-[.maintenance]:bg-primary group-[.degraded]:bg-[var(--hue-yellow)]",
        )}
      />
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          colors ?? "group-[.online]:bg-[var(--hue-green)] group-[.offline]:bg-destructive group-[.maintenance]:bg-primary group-[.degraded]:bg-[var(--hue-yellow)]",
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
