import { getIcon } from "@/kit/icons";
import { Button } from "@/kit/ui/button";
import { cn } from "@/kit/utils";

interface EmptyStateProps {
  icon: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  /** A quiet second button beside the first (only drawn with the first). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  variant?: "default" | "tile";
  title?: string;
  accent?: "primary" | "create" | "hero";
}

// spec/ui/schema.json's empty_state: {type, icon, text, action?}. The
// action here is a plain callback rather than the schema's typed `action`
// union (navigate/call/play/confirm/ask). That dispatch belongs to the
// generic UiNode interpreter, deferred (home/docs/dev.md, this slice).
export function EmptyState({ icon, text, actionLabel, onAction, secondaryLabel, onSecondary, variant = "default", title, accent = "primary" }: EmptyStateProps) {
  const Icon = getIcon(icon);
  if (variant === "tile") return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className={cn(
        "flex size-24 items-center justify-center rounded-[var(--radius-card)]",
        accent === "create" ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-create)_35%,var(--surface-2)),var(--surface-2))]" : accent === "hero" ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-hero)_35%,var(--surface-2)),var(--surface-2))]" : "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_35%,var(--surface-2)),var(--surface-2))]",
      )}>
        <Icon className="h-10 w-10 text-[var(--muted-foreground)]" aria-hidden />
      </div>
      {title ? <h2 className="text-[22px] font-semibold">{title}</h2> : null}
      <p className="text-sm text-[var(--muted-foreground)]">{text}</p>
      {actionLabel && onAction ? <Button variant="secondary" shape="pill" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="h-10 w-10 text-[var(--muted-foreground)]" aria-hidden />
      <p className="text-base text-[var(--muted-foreground)]">{text}</p>
      {actionLabel && onAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
          {secondaryLabel && onSecondary ? (
            <Button variant="ghost" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
