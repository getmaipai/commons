# UI decisions

| Part | Decision | Why no existing kit, shadcn or Kibo UI part does the job | Registry or library | Version |
|---|---|---|---|---|
| `prompt-bar` (element and `prompt_bar` schema node) | VIDEO-CREATE-01, 2026-11-01; owner chose a kit prompt bar over a faked form | A schema page had no way to carry several chosen values into one action: `search` carries one string, `picker` writes state but nothing submits it, and `form` is not allowed on a package page. The chat video card needs the same box. | shadcn `Textarea`, `Select`, `Button` and the kit `TierSegment` (TIER-UI-01); no Kibo part (checked: none fits) | ui-v0.5.452 |
| `hover-card` | AMBIENT-01, 2026-10-27 | `popover` does not open on pointer hover or trigger focus with a configurable delay. The companion preview needs both behaviors and Escape dismissal. | shadcn registry, Radix Hover Card | `@radix-ui/react-hover-card` 1.1.23 |

## ui-v0.5.420: ProgressRing and bottom tabs

`ProgressRing` is a pure display component with caller supplied fractional progress, centered content, token colors, an accessible percentage, and an SVG arc that starts at 12 o'clock. Its transition respects reduced motion. `TabsList` adds a `bottom` variant for full width phone navigation, with equal width 48 px minimum triggers and safe-area padding; `position="sticky"` sticks the list to its container bottom. Existing default and line styles remain unchanged.
