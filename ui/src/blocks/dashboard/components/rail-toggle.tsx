import { getIcon } from "@/kit/icons";
import { useSidebar } from "@/kit/ui/sidebar";
import { Button } from "@/kit/ui/button";

const ChevronsLeftIcon = getIcon("chevrons-left");
const ChevronsRightIcon = getIcon("chevrons-right");

/** The desktop rail's own expand/collapse control - the one place
 * collapsing to icons is offered, since it's the person's own choice,
 * never the default. Routed through the kit's own Button ("icon-sm")
 * rather than a raw `<button>`: a hand-rolled 32px box with no hit-area
 * extension, found by the far/TV a11y sweep actually measuring it for
 * the first time - the same 48px floor every other icon control here
 * already carries. */
export function RailToggle() {
  const { state, toggleSidebar } = useSidebar();
  const expanded = state === "expanded";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
      className="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      {expanded ? <ChevronsLeftIcon className="size-4" /> : <ChevronsRightIcon className="size-4" />}
    </Button>
  );
}
