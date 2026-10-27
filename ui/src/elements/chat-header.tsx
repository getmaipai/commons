import { useState, type ReactNode } from "react";
import { Button } from "@/kit/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/kit/ui/avatar";
import { Avatar as SeededAvatar } from "@/kit/primitives/Avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import { Input } from "@/kit/ui/input";
import { icons } from "@/kit/icons";
import { cn } from "@/kit/utils";

export interface ChatHeaderChoice {
  value: string;
  label: string;
  /** The companion's face; a seeded illustrated face is used when absent or unavailable. */
  imageUrl?: string;
  /** Seed for the illustrated face; defaults to `value`. */
  seed?: string;
  description?: string;
  hint?: string;
}

export interface ChatHeaderProps {
  /** Leaves room at the end for a control the shell draws at the top right of the workspace (the ambient companion). */
  reserveEnd?: boolean;
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
  identityIntro?: string;
  identitySearchLabel?: string;
  identityNotice?: string;
  identityFooter?: ReactNode;
}

export function ChatHeader({ reserveEnd, name, media, onMenu, onCall, actions, menuExpanded, menuControls, identityMenu, identityChoices, identityValue, onIdentityChange, identityLabel = "Change companion", identityIntro, identitySearchLabel, identityNotice, identityFooter }: ChatHeaderProps) {
  const [search, setSearch] = useState("");
  const searchable = Boolean(identityChoices && identitySearchLabel && identityChoices.length > 5);
  const filteredChoices = identityChoices?.filter((choice) => `${choice.label} ${choice.description ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const MenuIcon = icons.menu;
  const CallIcon = icons.phone;
  const ChevronDownIcon = icons["chevron-down"];
  const identity = <>
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">{media}</span>
    <span className="flex min-w-0 flex-col text-left"><span className="truncate text-sm font-medium">{name}</span>{identityNotice ? <span role="status" aria-live="polite" className="truncate text-xs text-muted-foreground">{identityNotice}</span> : null}</span>
  </>;
  const picker = identityChoices ? <>
    {identityIntro ? <p className="px-3 py-2 text-xs text-muted-foreground">{identityIntro}</p> : null}
    {searchable ? <div className="p-2" onKeyDown={(event) => event.stopPropagation()}><Input aria-label={identitySearchLabel} value={search} onChange={(event) => setSearch(event.currentTarget.value)} onKeyDown={(event) => event.stopPropagation()} /></div> : null}
    {filteredChoices?.length ? <DropdownMenuRadioGroup value={identityValue} onValueChange={onIdentityChange}>
      {filteredChoices.map((choice) => <DropdownMenuRadioItem key={choice.value} value={choice.value} className="min-h-12 gap-3">
        {choice.imageUrl ? <Avatar aria-hidden="true" className="size-9"><AvatarImage src={choice.imageUrl} alt="" /><AvatarFallback><SeededAvatar name={choice.label} seed={choice.seed ?? choice.value} className="size-9" /></AvatarFallback></Avatar> : <SeededAvatar name={choice.label} seed={choice.seed ?? choice.value} className="size-9" />}
        <span className="flex min-w-0 flex-1 flex-col text-left"><span className="truncate">{choice.label}</span>{choice.description ? <span className="truncate text-xs font-normal text-muted-foreground">{choice.description}</span> : null}</span>
        {choice.hint ? <span className="shrink-0 text-xs font-normal text-muted-foreground">{choice.hint}</span> : null}
      </DropdownMenuRadioItem>)}
    </DropdownMenuRadioGroup> : searchable && search ? <p className="px-3 py-2 text-sm text-muted-foreground">No companion matches. Clear the search to see them all.</p> : null}
    {identityFooter ? <><DropdownMenuSeparator />{identityFooter}</> : null}
  </> : identityMenu;
  return <header className={cn("grid h-14 w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4", reserveEnd && "pe-16")}>
    <div className="flex items-center justify-self-start">{onMenu ? <Button variant="ghost" size="icon" aria-label="Open menu" aria-expanded={menuExpanded} aria-controls={menuControls} onClick={onMenu}><MenuIcon aria-hidden="true" /></Button> : null}</div>
    {picker ? <DropdownMenu onOpenChange={(open) => { if (open) setSearch(""); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={identityLabel} className="min-w-0 justify-center gap-2 px-2">
          {identity}<ChevronDownIcon aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="max-h-[min(80vh,36rem)] w-[min(22rem,calc(100vw-2rem))]">{picker}</DropdownMenuContent>
    </DropdownMenu> : <div className="flex min-w-0 items-center justify-center gap-2">{identity}</div>}
    <div className="flex items-center justify-self-end gap-1">
      {actions}
      {onCall ? <Button variant="ghost" size="icon" aria-label={`Call ${name}`} onClick={onCall}><CallIcon aria-hidden="true" /></Button> : null}
    </div>
  </header>;
}
