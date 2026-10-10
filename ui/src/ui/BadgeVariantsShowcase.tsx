"use client";

// Story for the additive Badge variants, next to the unchanged default. Placement
// "corner" needs a relative parent.
import { Badge } from "./badge";

export function BadgeVariantsShowcase() {
  return (
    <div className="flex items-center gap-3">
      <Badge variant="secondary">Default</Badge>
      <Badge variant="secondary" tone="success">Fits</Badge>
      <Badge variant="secondary" tone="warning">Slow</Badge>
      <span className="relative inline-flex size-10 items-center justify-center rounded-md border">
        Inbox
        <Badge variant="destructive" placement="corner">3</Badge>
      </span>
    </div>
  );
}
