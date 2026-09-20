import type { IconName } from "@/kit/icons";
import { IconTile } from "@/kit/primitives/IconTile";

export interface ActionTileProps {
  icon: IconName;
  /** Defaults to blue (spec's Quick Actions reference: a uniform tile
   * color, unlike the category-hued tiles elsewhere). */
  hue?: string;
  label: string;
  subtitle: string;
  onClick: () => void;
}

// Quick Actions tiles (spec section 3): the icon tile, direct-verb
// label, one supporting line.
export function ActionTile({ icon, hue = "--hue-blue", label, subtitle, onClick }: ActionTileProps) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl border bg-[var(--surface-card)] p-3 text-left hover:bg-[var(--surface-pane)]">
      <IconTile icon={icon} hue={hue} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}
