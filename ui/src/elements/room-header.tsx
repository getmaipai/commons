"use client";
import type { ReactNode } from "react";
import { Switch } from "@/kit/ui/switch";
import { i18n } from "@/kit/i18n";

export interface RoomHeaderProps {
  name: string;
  /** Devices in the room that are on. */
  onCount: number;
  total: number;
  pending?: boolean;
  /** Turns every device in the room on (when none is) or off. */
  onToggleAll: (next: boolean) => void;
  /** The room's tiles. */
  children?: ReactNode;
}

/** Room section: a master toggle, an "N of M on" counter, then the room's tiles. */
export function RoomHeader({ name, onCount, total, pending = false, onToggleAll, children }: RoomHeaderProps) {
  const anyOn = onCount > 0;
  return (
    <section data-slot="room-header" aria-label={name} className="flex w-full flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{name}</h2>
          <p className="text-muted-foreground text-xs" aria-live="polite">{i18n._({ id: "ui.{on} of {total} on", message: "{on} of {total} on", values: { on: onCount, total } })}</p>
        </div>
        <Switch aria-label={i18n._({ id: "ui.All of {name}", message: "All of {name}", values: { name } })} checked={anyOn} disabled={pending || total === 0} onCheckedChange={next => onToggleAll(next)} />
      </header>
      {children ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div> : null}
    </section>
  );
}
