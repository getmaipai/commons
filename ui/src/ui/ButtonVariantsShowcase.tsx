"use client";

// Story for the additive Button layout variants: start-aligned, auto-height,
// full-width and wrapping text, next to the unchanged default.
import { Button } from "./button";

export function ButtonVariantsShowcase() {
  return (
    <div className="flex w-72 flex-col gap-3">
      <Button variant="outline">Default</Button>
      <Button variant="outline" width="full" align="start">
        Full width, start-aligned
      </Button>
      <Button variant="outline" width="full" align="start" height="auto" wrap="wrap">
        Auto height with a long label that wraps onto a second line
      </Button>
    </div>
  );
}
