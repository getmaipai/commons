"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Clock3Icon } from "lucide-react";
import { cn } from "cn";
import { mono, paper } from "./surfaces";

function remaining(endsAt: string, now: number): number { return Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000)); }
function display(seconds: number): string { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`; }

export function Countdown({ label, endsAt, now: suppliedNow, className, ...props }: Omit<ComponentProps<"div">, "children"> & { label: string; endsAt: string; now?: number }) {
  const [now, setNow] = useState(() => suppliedNow ?? Date.now());
  useEffect(() => {
    if (suppliedNow !== undefined) return;
    const tick = () => setNow(Date.now());
    const delay = Math.max(50, 1000 - (Date.now() % 1000));
    const timeout = window.setTimeout(() => { tick(); const interval = window.setInterval(tick, 1000); cleanupInterval = interval; }, delay);
    let cleanupInterval: number | undefined;
    return () => { window.clearTimeout(timeout); if (cleanupInterval !== undefined) window.clearInterval(cleanupInterval); };
  }, [endsAt, suppliedNow]);
  const seconds = remaining(endsAt, now);
  return <div data-slot="countdown" data-expired={seconds === 0 ? "" : undefined} className={cn(paper, "flex w-full max-w-sm items-center gap-3 rounded-2xl p-4", className)} {...props}>
    <span className="bg-foreground/[0.05] text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full"><Clock3Icon aria-hidden="true" className="size-4" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{label}</span>{seconds === 0 ? <span role="status" aria-live="polite" className="text-muted-foreground text-xs">Time is up</span> : <span className={cn(mono, "text-muted-foreground text-xs")} aria-label={`${seconds} seconds remaining`}>{display(seconds)}</span>}</span>
  </div>;
}
