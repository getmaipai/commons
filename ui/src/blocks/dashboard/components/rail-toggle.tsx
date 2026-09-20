import { getIcon } from "@/kit/icons";
import { useSidebar } from "@/kit/ui/sidebar";

const ChevronsLeftIcon = getIcon("chevrons-left");
const ChevronsRightIcon = getIcon("chevrons-right");

/** The desktop rail's own expand/collapse control - the one place
 * collapsing to icons is offered, since it's the person's own choice,
 * never the default. */
export function RailToggle() {
  const { state, toggleSidebar } = useSidebar();
  const expanded = state === "expanded";
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      {expanded ? <ChevronsLeftIcon className="size-4" /> : <ChevronsRightIcon className="size-4" />}
    </button>
  );
}
