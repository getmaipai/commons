// The Stack's "memory right now" breakdown, in one place for the Stack's own admin page and Home's Settings. Both feed it the Stack's own readings
// (`/stack/v1/resources/summary` and `/stack/v1/resources/engines`); nothing here measures or keeps anything. Pure: no React, no i18n except the
// plain words, so a test can load it.
import { i18n } from "@/kit/i18n";

/** The part of the Stack's `resources/summary.current` the bar needs. */
export interface StackMemoryReading { total: number; used: number; avail: number; pressure: number }
/** The part of one `resources/engines` row the bar needs. */
export interface StackMemoryEngine { role: string; label: string; state: "running" | "idle" | "loading" | "queued"; model_id: string | null; memory_bytes: number }
export type StackMemorySegmentKind = "role" | "other" | "free";
export interface StackMemorySegment { id: string; label: string; detail: string | null; bytes: number; color: string; percent: number; kind: StackMemorySegmentKind }

/** The Stack's own feature order (it knows its features) first, then the roles that are not features. Callers pass the order the Stack lists. */
const NON_FEATURE_ROLES = ["helper", "judge", "router", "rerank"];
const FALLBACK_ORDER = ["chat", "coding", "image", "tts", "stt", "embed", "video", "music", "vision", "wakeword"];
const ROLE_SLOTS = ["var(--chart-1)", "var(--primary)", "color-mix(in oklab, var(--chart-1) 45%, var(--foreground))", "var(--chart-2)", "color-mix(in oklab, var(--primary) 45%, var(--foreground))", "var(--chart-3)"];

/** A feature keeps one color on every bar and chart because the slot follows the fixed order, not the memory it holds today. */
export function stackRoleColor(role: string, featureOrder: readonly string[] = []): string {
  const order = [...(featureOrder.length ? featureOrder : FALLBACK_ORDER), ...NON_FEATURE_ROLES];
  const i = order.indexOf(role);
  const n = i >= 0 ? i : order.length + [...role].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 12;
  const base = ROLE_SLOTS[n % ROLE_SLOTS.length]!;
  return n < ROLE_SLOTS.length ? base : `color-mix(in oklab, ${base} ${n < 2 * ROLE_SLOTS.length ? 60 : 38}%, var(--card))`;
}

/** The memory bar: each running feature, then everything else in use, then free. Percentages are of the whole computer and sum to at most 100. */
export function stackMemorySegments(current: StackMemoryReading | null, engines: readonly StackMemoryEngine[], modelName: (id: string | null) => string | null = () => null, featureOrder: readonly string[] = []): StackMemorySegment[] {
  if (!current || current.total <= 0) return [];
  const live = engines.filter((e) => e.memory_bytes > 0).sort((a, b) => b.memory_bytes - a.memory_bytes);
  const named = live.reduce((n, e) => n + e.memory_bytes, 0);
  const raw: Omit<StackMemorySegment, "percent">[] = [
    ...live.map((e) => ({ id: e.role, label: e.label, detail: modelName(e.model_id), bytes: e.memory_bytes, color: stackRoleColor(e.role, featureOrder), kind: "role" as const })),
    { id: "other", label: i18n._({ id: "ui.Other apps and the system", message: "Other apps and the system" }), detail: null, bytes: Math.max(0, current.used - named), color: "var(--muted-foreground)", kind: "other" },
    { id: "free", label: i18n._({ id: "ui.Free", message: "Free" }), detail: null, bytes: Math.max(0, current.avail), color: "var(--muted)", kind: "free" },
  ];
  let left = 100;
  return raw.map((s) => { const percent = Math.min(left, (s.bytes / current.total) * 100); left -= percent; return { ...s, percent }; });
}

/** The Stack's memory-pressure level (0 to 4) in a plain word and the status kind it maps to. */
export function stackPressureWord(level: number | undefined): { word: string; kind: "online" | "degraded" | "offline" } {
  if (level === undefined) return { word: i18n._({ id: "ui.Unknown", message: "Unknown" }), kind: "degraded" };
  if (level >= 4) return { word: i18n._({ id: "ui.Critical", message: "Critical" }), kind: "offline" };
  if (level >= 2) return { word: i18n._({ id: "ui.Getting tight", message: "Getting tight" }), kind: "degraded" };
  return { word: i18n._({ id: "ui.Comfortable", message: "Comfortable" }), kind: "online" };
}

/** A share of the computer as a percent; under 10 percent keeps one decimal so a small feature does not read as 0 or 1. */
export function stackShareText(n: number, total: number): string {
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  return total > 0 && n / total < 0.1 ? `${((n / total) * 100).toFixed(1)}%` : `${pct(n)}%`;
}
