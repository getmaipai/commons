"use client";

// Story for the additive SelectTrigger variants, next to the unchanged default.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../dashboard/components/ui/select";

export function SelectVariantsShowcase() {
  return (
    <div className="flex w-72 flex-col gap-3">
      <Select defaultValue="a">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="a">Default</SelectItem></SelectContent>
      </Select>
      <Select defaultValue="a">
        <SelectTrigger size="touch" width="full"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="a">Touch size, full width</SelectItem></SelectContent>
      </Select>
    </div>
  );
}
