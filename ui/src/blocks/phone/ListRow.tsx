import { getIcon, type IconName } from "@/kit/icons";
import { hueTextColor } from "@/kit/utils";

// Regression: `text-emerald-600`/`text-amber-600` are raw Tailwind
// palette classes, not theme-aware - axe caught emerald-600 failing
// AA on the phone list's light-theme background (found live, on the
// Apps page's first real phone use of this row). The kit's own hue
// system already solves exactly this (StatusPill/TypeBadge's
// hueTextColor, `HUE_TEXT_MIX` against `--foreground`); `offline`
// carries no named hue of its own, so it reuses red the same way it
// already reused `text-destructive`/`bg-destructive`.
const TONE_HUE: Record<"ready" | "attention" | "offline" | "detected", string> = {
  ready: "--hue-teal",
  attention: "--hue-orange",
  offline: "--hue-red",
  detected: "--hue-blue",
};

export function ListRow({ icon = "box", name, subtitle, status, subStatus, tone = "ready", onClick }: { icon?: IconName; name: string; subtitle?: string; status?: string; subStatus?: string; tone?: "ready" | "attention" | "offline" | "detected"; onClick?: () => void }) {
  const Icon = getIcon(icon);
  const hue = TONE_HUE[tone];
  return <button type="button" className="flex min-h-11 w-full items-center gap-3 border-b px-1 py-2 text-left" style={{ minHeight: subtitle ? 64 : 48 }} onClick={onClick}><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="line-clamp-2 font-medium">{name}</span>{subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}</span><span className="flex min-w-16 items-center justify-end gap-2"><span className="text-right"><span className="block text-sm font-medium" style={{ color: hueTextColor(hue) }}>{status}</span>{subStatus && <span className="block max-w-28 truncate text-xs text-muted-foreground">{subStatus}</span>}</span><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: `var(${hue})` }} /><span aria-hidden className="text-lg text-muted-foreground">›</span></span></button>;
}
