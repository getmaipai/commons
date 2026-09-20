import type { ReactNode } from "react";
import { getIcon, type IconName } from "@/kit/icons";
import { Button } from "@/kit/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import { pauseTvNavForOverlay } from "@/kit/tvNav";

export type HeaderPickerStatus = "ok" | "warning" | "error" | "critical" | null;

const STATUS_DOT_CLASS: Record<Exclude<HeaderPickerStatus, null>, string> = {
  ok: "bg-[var(--hue-teal)]",
  warning: "bg-[var(--hue-orange)]",
  error: "bg-[var(--hue-red)]",
  critical: "bg-[var(--hue-red)]",
};

function StatusDot({ status }: { status: HeaderPickerStatus }) {
  if (!status) return null;
  return <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_DOT_CLASS[status]}`} />;
}

export interface HeaderPickerItem {
  id: string;
  label: string;
  sublabel?: string;
  status?: HeaderPickerStatus;
}

export interface HeaderPickerAction {
  id: string;
  label: string;
  icon: IconName;
  onSelect: () => void;
}

export interface HeaderPickerProps {
  triggerIcon: IconName;
  triggerLabel: string;
  triggerStatus?: HeaderPickerStatus;
  current: HeaderPickerItem;
  currentLabel?: string;
  /** Other switchable items (a household's other machines, other
   * profiles) - omitted or empty renders no "switch" section at all. */
  otherItems?: HeaderPickerItem[];
  otherItemsLabel?: string;
  onSelectOther?: (id: string) => void;
  actions: HeaderPickerAction[];
}

/** A header dropdown: an icon+status-dot+label trigger, a highlighted
 * "current" row, an optional list of other switchable items, then a
 * fixed action list (settings, help, sign-out). The Stack's own
 * machine/stack selector is the reference this generalizes - any
 * "what am I looking at, and what else could I switch to" header
 * control can build on it. */
export function HeaderPicker({
  triggerIcon,
  triggerLabel,
  triggerStatus = null,
  current,
  currentLabel = "Current",
  otherItems = [],
  otherItemsLabel = "Switch",
  onSelectOther,
  actions,
}: HeaderPickerProps): ReactNode {
  const TriggerIcon = getIcon(triggerIcon);
  const ChevronDownIcon = getIcon("chevron-down");

  return (
    <DropdownMenu onOpenChange={pauseTvNavForOverlay}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label={`${triggerLabel}: ${current.label}`} className="flex items-center gap-1.5">
          <TriggerIcon className="size-4" />
          <StatusDot status={triggerStatus} />
          <span className="hidden max-w-32 truncate text-sm lg:inline">{current.label}</span>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{currentLabel}</DropdownMenuLabel>
        <DropdownMenuItem disabled className="flex items-start gap-2 rounded-sm bg-[var(--primary)]/15 opacity-100 data-[disabled]:opacity-100">
          <TriggerIcon className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{current.label}</span>
            {current.sublabel ? <span className="block truncate text-xs text-muted-foreground">{current.sublabel}</span> : null}
          </span>
          <StatusDot status={current.status ?? null} />
        </DropdownMenuItem>
        {otherItems.length > 0 ? (
          <>
            <DropdownMenuLabel>{otherItemsLabel}</DropdownMenuLabel>
            {otherItems.map((item) => (
              <DropdownMenuItem key={item.id} onSelect={() => onSelectOther?.(item.id)}>
                <TriggerIcon className="size-4" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.sublabel ? <span className="text-xs text-muted-foreground">{item.sublabel}</span> : null}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        {actions.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {actions.map((action) => {
              const ActionIcon = getIcon(action.icon);
              return (
                <DropdownMenuItem key={action.id} onSelect={action.onSelect}>
                  <ActionIcon className="size-4" />
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
