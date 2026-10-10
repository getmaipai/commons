"use client";

// Story for the additive PopoverContent variants, next to the unchanged default.
import { Popover, PopoverContent, PopoverTrigger } from "../dashboard/components/ui/popover";

export function PopoverVariantsShowcase() {
  return (
    <div className="flex gap-3">
      <Popover>
        <PopoverTrigger>Default</PopoverTrigger>
        <PopoverContent>Fixed width with padding</PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger>No padding, auto width</PopoverTrigger>
        <PopoverContent padding="none" width="auto">Content draws to the edge</PopoverContent>
      </Popover>
    </div>
  );
}
