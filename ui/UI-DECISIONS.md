# UI decisions

| Part | Decision | Why no existing kit, shadcn or Kibo UI part does the job | Registry or library | Version |
|---|---|---|---|---|
| `hover-card` | AMBIENT-01, 2026-10-27 | `popover` does not open on pointer hover or trigger focus with a configurable delay. The companion preview needs both behaviors and Escape dismissal. | shadcn registry, Radix Hover Card | `@radix-ui/react-hover-card` 1.1.23 |
