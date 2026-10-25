import type { ReactNode } from "react";
import { Button } from "@/kit/ui/button";
import { icons } from "@/kit/icons";

export interface ChatHeaderProps {
  name: string;
  media: ReactNode;
  onMenu?: () => void;
  onCall?: () => void;
  /** Rendered immediately left of the Call button (for example a conversation actions menu). */
  actions?: ReactNode;
  /** Forwarded to the menu button as aria-expanded. */
  menuExpanded?: boolean;
  /** Forwarded to the menu button as aria-controls. */
  menuControls?: string;
}

export function ChatHeader({ name, media, onMenu, onCall, actions, menuExpanded, menuControls }: ChatHeaderProps) {
  const MenuIcon = icons.menu;
  const CallIcon = icons.phone;
  return <header className="relative z-10 flex h-24 items-start justify-between px-4 pt-3 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-8 after:bg-gradient-to-b after:from-background after:to-transparent">
    {onMenu ? <Button variant="ghost" size="icon" aria-label="Open menu" aria-expanded={menuExpanded} aria-controls={menuControls} onClick={onMenu}><MenuIcon aria-hidden="true" /></Button> : <span />}
    <div className="absolute left-1/2 top-1 flex -translate-x-1/2 flex-col items-center">
      <div className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-muted">{media}</div>
      <span className="-mt-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">{name}</span>
    </div>
    {actions || onCall ? <div className="flex items-center gap-1">
      {actions}
      {onCall ? <Button variant="ghost" size="icon" aria-label={`Call ${name}`} onClick={onCall}><CallIcon aria-hidden="true" /></Button> : null}
    </div> : <span />}
  </header>;
}
