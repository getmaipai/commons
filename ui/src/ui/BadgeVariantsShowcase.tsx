"use client";

// Story for the additive Badge variants, next to the unchanged default.
import { Badge } from "./badge";

export function BadgeVariantsShowcase() {
  return (
    <div className="flex items-center gap-3">
      <Badge variant="secondary">Default</Badge>
      <Badge variant="secondary" tone="success">Fits</Badge>
      <Badge variant="secondary" tone="warning">Slow</Badge>
    </div>
  );
}
