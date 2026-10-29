# Companion three screens: kit audit (KIT-3S-01, COMPANION-3S-01)

Every region of the three mockups (Create Character, Animate Character, Customize Companion) is drawn by a shipped part. Each gap below was closed with an additive prop or variant; a caller sets no `className`. Colours are theme tokens only. Story and test: `ui/src/ui/CompanionFlowShowcase.tsx`, `ui/src/ui/companion-flow.test.tsx`.

| Region | Part | Lacked | Added |
|---|---|---|---|
| Large rounded dialog, full screen on a phone | `ui/dialog` | only default, command, call variants | `DialogContent variant="flow"` |
| Big title | `DialogTitle` | one size | `size="xl"` |
| Muted subtitle "Step 1 of 3" | `DialogDescription` | nothing | none |
| Close X at top right | `DialogContent` | placed for a small dialog | flow places it at the card corner |
| Two-column body | none | no layout part | `DialogBody columns="two"` (stacks on a phone) |
| Section heading with icon, right aside (count, Select All) | none | no part | `DialogSection title icon aside` |
| Three-segment step bar, filled up to the step | `primitives/Progress` (segments) | earlier segments dimmed, thin | `tone="solid"`, `size="md"` |
| Labelled pill input | `ui/input` | rounded-md only | `shape="pill"` |
| Textarea | `ui/textarea` | small corner | `shape="rounded"` |
| Two-option segmented toggle | `ui/toggle-group` | square-corner group only | `variant="segmented"`, `fill` |
| Wrap of pill choice chips, one selected (light fill) | `ui/toggle-group` | no chip look, no wrap | `variant="chip"`, `wrap` |
| Pill select with Preview button | `ui/select`, `ui/button` | rounded-md trigger, rounded-md outline button | `SelectTrigger shape="pill"`, `Button shape="pill"` |
| Style tile: picture above label, selected framed with bold label | `primitives/CharacterTile` | only a round portrait | `variant="picture"` |
| Animation tile: still, label, lock, checkbox | `primitives/CharacterTile` | no lock or checkbox | `variant="animation"`, `locked`, `checked`, `onCheckedChange` |
| Large rounded preview panel with caption | `elements/generation-stage` | rounded-2xl card, no caption | `shape="panel"`, `caption` |
| Companion Preview panel with picture and two pill actions | `elements/companion-stage` | plain layout, outline start-aligned actions | `surface="panel"`, action `primary` |
| Footer: Back left, Continue or a muted note right | `DialogFooter`, `Button` | end-aligned only | `align="between"` |
| Full-width pill primary with an icon | `ui/button` | width and icon already exist | `shape="pill"` |
| Required count, Select All link | `DialogSection aside`, `Button variant="link"` | nothing | none |

Not added: `ui/progress` (the Radix bar) stays a single bar; the segmented bar is `primitives/Progress`, the one place it already lived. `Wizard` is a page-level layout (`main`, `h-dvh`), so the dialog flow does not use it. No new registry part was needed. `DialogBody` and `DialogSection` are two small layout exports of the shipped `dialog.tsx`, not new files.
