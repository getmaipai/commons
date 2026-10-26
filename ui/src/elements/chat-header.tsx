import type { ReactNode } from "react";
import { Button } from "@/kit/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
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
  /** Optional menu content for changing the current companion. */
  identityMenu?: ReactNode;
  /** Accessible label for the companion picker. */
  identityLabel?: string;
}

export function ChatHeader({ name, media, onMenu, onCall, actions, menuExpanded, menuControls, identityMenu, identityLabel = "Change companion" }: ChatHeaderProps) {
  const MenuIcon = icons.menu;
  const CallIcon = icons.phone;
  const ChevronDownIcon = icons["chevron-down"];
  const identity = <>
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">{media}</span>
    <span className="truncate text-sm font-medium">{name}</span>
  </>;
  return <header className="flex h-14 items-center justify-between gap-2 px-4">
    {onMenu ? <Button variant="ghost" size="icon" aria-label="Open menu" aria-expanded={menuExpanded} aria-controls={menuControls} onClick={onMenu}><MenuIcon aria-hidden="true" /></Button> : null}
    {identityMenu ? <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={identityLabel} className="mr-auto min-w-0 justify-start gap-2 px-2">
          {identity}<ChevronDownIcon aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">{identityMenu}</DropdownMenuContent>
    </DropdownMenu> : <div className="mr-auto flex min-w-0 items-center gap-2">{identity}</div>}
    {actions || onCall ? <div className="flex items-center gap-1">
      {actions}
      {onCall ? <Button variant="ghost" size="icon" aria-label={`Call ${name}`} onClick={onCall}><CallIcon aria-hidden="true" /></Button> : null}
    </div> : <span />}
  </header>;
}
