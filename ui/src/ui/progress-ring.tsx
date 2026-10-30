import * as React from "react";
import { cn } from "@/kit/utils";

export interface ProgressRingProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  label: string;
  tone?: "primary" | "muted";
  animated?: boolean;
}

function ProgressRing({ value, size = 240, strokeWidth = 10, children, label, tone = "primary", animated = true, className, ...props }: ProgressRingProps) {
  const normalized = Math.max(0, Math.min(1, value));
  const radius = Math.max(0, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  return (
    <div {...props} className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size, ...props.style }}>
      <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle data-slot="progress-ring-arc" data-animated={animated} data-tone={tone} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={tone === "primary" ? "var(--primary)" : "var(--muted-foreground)"} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - normalized)} className={cn("transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none", !animated && "transition-none")} />
      </svg>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(normalized * 100)} data-tone={tone} className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export { ProgressRing };
