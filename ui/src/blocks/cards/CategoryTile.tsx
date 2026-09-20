import { Link } from "react-router-dom";
import type { IconName } from "@/kit/icons";
import { IconTile } from "@/kit/primitives/IconTile";

export interface CategoryTileProps {
  icon: IconName;
  hue: string;
  label: string;
  /** The state line under the label - an installed count by default,
   * or a caller's own state text (docs "Your apps" strip). */
  installedCount?: number;
  state?: string;
  browsePath: string;
}

// Installed Components tiles (spec section 3): the icon tile, name,
// installed count or a caller's own state, Browse All.
export function CategoryTile({ icon, hue, label, installedCount, state, browsePath }: CategoryTileProps) {
  return (
    <Link to={browsePath} className="flex min-w-[9rem] flex-col gap-2 rounded-xl border bg-[var(--surface-card)] p-3 hover:bg-[var(--surface-pane)]">
      <IconTile icon={icon} hue={hue} size="sm" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{state ?? `${installedCount ?? 0} installed`}</p>
      </div>
    </Link>
  );
}
