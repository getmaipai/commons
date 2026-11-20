// Disk levels: one definition of when free space is "getting full" and "critical" (DISK-GUARD-01). Pure: the Stack and Home both call it.
// Each line is the larger of a byte floor and a share of the volume, so a small drive and a 2 TB drive both warn early enough.
export type DiskLevel = "normal" | "warn" | "critical";
export const DISK_WARN_FLOOR_BYTES = 30_000_000_000;
export const DISK_WARN_SHARE = 0.1;
export const DISK_CRITICAL_FLOOR_BYTES = 10_000_000_000;
export const DISK_CRITICAL_SHARE = 0.03;
export const DISK_CLEAR_SHARE = 0.01;

export interface DiskLevelOverrides { warnFreeGb?: number; criticalFreeGb?: number }
export interface DiskLines { warnBytes: number; criticalBytes: number; clearMarginBytes: number }

/** The two free-space lines for a volume. An override of 0 (or missing) means "use the rule". */
export function diskLines(totalBytes: number, overrides: DiskLevelOverrides = {}): DiskLines {
  const GB = 1_000_000_000;
  const rule = (floor: number, share: number) => Math.max(floor, Math.round(totalBytes * share));
  const warn = overrides.warnFreeGb && overrides.warnFreeGb > 0 ? overrides.warnFreeGb * GB : rule(DISK_WARN_FLOOR_BYTES, DISK_WARN_SHARE);
  const critical = overrides.criticalFreeGb && overrides.criticalFreeGb > 0 ? overrides.criticalFreeGb * GB : rule(DISK_CRITICAL_FLOOR_BYTES, DISK_CRITICAL_SHARE);
  return { warnBytes: Math.max(warn, critical), criticalBytes: critical, clearMarginBytes: Math.round(totalBytes * DISK_CLEAR_SHARE) };
}

/** The level for a reading. `previous` adds hysteresis: a level clears only once free space is the margin above its line. */
export function diskLevel(freeBytes: number, totalBytes: number, previous: DiskLevel = "normal", overrides: DiskLevelOverrides = {}): DiskLevel {
  const { warnBytes, criticalBytes, clearMarginBytes } = diskLines(totalBytes, overrides);
  if (freeBytes < criticalBytes) return "critical";
  if (previous === "critical" && freeBytes < criticalBytes + clearMarginBytes) return "critical";
  if (freeBytes < warnBytes) return "warn";
  if (previous !== "normal" && freeBytes < warnBytes + clearMarginBytes) return "warn";
  return "normal";
}
