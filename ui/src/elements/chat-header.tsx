import type { ReactNode } from "react";
import { Button } from "@/kit/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/kit/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import { icons } from "@/kit/icons";

export interface ChatHeaderChoice {
  value: string;
  label: string;
  /** The companion's face; the label's first letter shows until it loads or when absent. */
  imageUrl?: string;
}

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
  /** Companion choices drawn as a radio list with each face beside its name; used in place of `identityMenu` content. */
  identityChoices?: ChatHeaderChoice[];
  /** The selected choice's `value`. */
  identityValue?: string;
  onIdentityChange?: (value: string) => void;
  /** Accessible label for the companion picker. */
  identityLabel?: string;
}

export function ChatHeader({ name, media, onMenu, onCall, actions, menuExpanded, menuControls, identityMenu, identityChoices, identityValue, onIdentityChange, identityLabel = "Change companion" }: ChatHeaderProps) {
  const MenuIcon = icons.menu;
  const CallIcon = icons.phone;
  const ChevronDownIcon = icons["chevron-down"];
  const identity = <>
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">{media}</span>
    <span className="truncate text-sm font-medium">{name}</span>
  </>;
  const picker = identityChoices ? <DropdownMenuRadioGroup value={identityValue} onValueChange={onIdentityChange}>
    {identityChoices.map((choice) => <DropdownMenuRadioItem key={choice.value} value={choice.value} className="gap-3">
      <Avatar aria-hidden="true"><AvatarImage src={choice.imageUrl} alt="" /><AvatarFallback>{choice.label.slice(0, 1)}</AvatarFallback></Avatar>
      <span className="truncate">{choice.label}</span>
    </DropdownMenuRadioItem>)}
  </DropdownMenuRadioGroup> : identityMenu;
  return <header className="grid h-14 w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
    <div className="flex items-center justify-self-start">{onMenu ? <Button variant="ghost" size="icon" aria-label="Open menu" aria-expanded={menuExpanded} aria-controls={menuControls} onClick={onMenu}><MenuIcon aria-hidden="true" /></Button> : null}</div>
    {picker ? <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={identityLabel} className="min-w-0 justify-center gap-2 px-2">
          {identity}<ChevronDownIcon aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">{picker}</DropdownMenuContent>
    </DropdownMenu> : <div className="flex min-w-0 items-center justify-center gap-2">{identity}</div>}
    <div className="flex items-center justify-self-end gap-1">
      {actions}
      {onCall ? <Button variant="ghost" size="icon" aria-label={`Call ${name}`} onClick={onCall}><CallIcon aria-hidden="true" /></Button> : null}
    </div>
  </header>;
}
