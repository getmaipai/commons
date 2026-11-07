import type { ComponentType, SVGProps } from "react";
import { cn } from "../../../../../utils";

export interface HeaderTitleProps {
  /** The page or app icon, drawn before the name (hidden on a phone when `heading`). */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** The page or app name. */
  label: string;
  /** True makes the name the page's `h1` (an app with no other heading). */
  heading?: boolean;
  /** Marks the title for the phone layouts where a page places its own top row. */
  hideInTopRow?: boolean;
  className?: string;
}

/**
 * The header bar's title (UI-KIT-GAPS-06): the icon and the page name for `useHeaderExtra`. A long or translated name wraps to a
 * second line and breaks inside a very long word; it is cut with an ellipsis only after two lines, so "Recordatorios" never
 * shows as "Recordator..." at 360 or 402 px. The text shrinks on a phone (`text-base`), the icon keeps its size.
 */
export function HeaderTitle({ icon: EntryIcon, label, heading = false, hideInTopRow = false, className }: HeaderTitleProps) {
  const Name = heading ? "h1" : "span";
  return (
    <div
      data-slot="header-title-row"
      className={cn("flex min-w-0 flex-1 items-center gap-3 px-2", heading && "max-sm:px-0", className)}
      {...(hideInTopRow ? { "data-top-row-hide": "" } : {})}
    >
      <EntryIcon aria-hidden className={cn("text-muted-foreground size-6 shrink-0", heading && "max-sm:hidden")} />
      <Name
        data-slot="header-title"
        title={label}
        className="min-w-0 flex-1 text-xl leading-tight font-semibold wrap-anywhere line-clamp-2 max-sm:text-base"
      >
        {label}
      </Name>
    </div>
  );
}
