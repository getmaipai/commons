/**
 * STATUS-COLORS-01: the one place a status maps to a color. The four
 * `--status-*` tokens (tokens.css) hold one literal value per theme; every
 * LED, badge and strip draws from this table, so the rail Chat LED, the
 * profile LED, the chat status line and the status page cannot drift apart.
 * Maintenance is not a health level: it keeps the brand `--primary`.
 */
export type StatusTone = "ok" | "warning" | "error" | "unknown" | "maintenance";

export const STATUS_TONE_BG: Record<StatusTone, string> = {
  ok: "bg-[var(--status-ok)]",
  warning: "bg-[var(--status-warning)]",
  error: "bg-[var(--status-error)]",
  unknown: "bg-[var(--status-unknown)]",
  maintenance: "bg-primary",
};

/** Class fragments for the `group-[.state]:` form the Status badge uses. */
export const STATUS_GROUP_BG =
  "group-[.online]:bg-[var(--status-ok)] group-[.offline]:bg-[var(--status-error)] group-[.maintenance]:bg-primary group-[.degraded]:bg-[var(--status-warning)]";

/** The four health words the rail and Status badge use, as tones. */
export const STATUS_LEVEL_TONE = {
  online: "ok",
  maintenance: "maintenance",
  degraded: "warning",
  offline: "error",
} as const satisfies Record<string, StatusTone>;
