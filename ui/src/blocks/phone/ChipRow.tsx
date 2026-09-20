// docs/UI.md's 48px touch-target floor: `min-h-11` (44px) missed it by
// 4px, caught live by the a11y gate on the Apps page's first real phone
// use of this row. `min-h-12` (48px), not `hitArea()`: a chip's own
// visible box is the target here, not an invisible overhang around a
// smaller one.
export function ChipRow({ chips, active, onSelect }: { chips: string[]; active?: string; onSelect?: (chip: string) => void }) {
  return <div className="flex min-h-12 gap-2 overflow-x-auto py-1" aria-label="Filters">{chips.map((chip) => <button type="button" key={chip} className={`min-h-12 shrink-0 rounded-full border px-4 text-sm ${active === chip ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`} onClick={() => onSelect?.(chip)}>{chip}</button>)}</div>;
}
