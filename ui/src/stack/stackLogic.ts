// STACK-MODELS-PAGE-01. The page's pure logic: no React, no network. Kept apart so the wording rules and the arithmetic have their own tests.
import type { StackCandidate, StackChoiceCategory, StackLevel, StackLevelRow } from "./StackClient";

export const LEVEL_ORDER: readonly StackLevel[] = ["reduced", "standard", "boost", "max"];

export type Tone = "primary" | "ok" | "warn" | "bad" | "muted";

/** The level rows in the order a person reads them (Reduced to Max). */
export function levelsOf(category: StackChoiceCategory): StackLevelRow[] {
  return [...category.tiers].sort((a, b) => LEVEL_ORDER.indexOf(a.tier) - LEVEL_ORDER.indexOf(b.tier));
}

export function candidateById(category: StackChoiceCategory, id: string | null): StackCandidate | null {
  return id ? category.candidates.find((c) => c.id === id) ?? null : null;
}

/** The model a feature's card headlines: its Standard level, else the first level that has one. */
export function headlineModel(category: StackChoiceCategory): { row: StackLevelRow; candidate: StackCandidate } | null {
  const rows = levelsOf(category);
  const standard = rows.find((r) => r.tier === "standard");
  for (const row of standard ? [standard, ...rows.filter((r) => r !== standard)] : rows) {
    const candidate = candidateById(category, row.chosen);
    if (candidate) return { row, candidate };
  }
  return null;
}

/** model id to its plain label, across every feature, so a sentence about "llama33-70b-q4" can say "Llama 3.3 70B". */
export function labelIndex(categories: readonly StackChoiceCategory[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const category of categories) for (const candidate of category.candidates) if (!map.has(candidate.id)) map.set(candidate.id, candidate.label);
  return map;
}

export type CardState = "unavailable" | "off" | "problem" | "downloading" | "failed" | "missing" | "ready" | "unset";

/** What one line under a feature says: the first thing that is true, worst first. */
export function cardState(category: StackChoiceCategory): { state: CardState; percent: number | null } {
  if (!category.available) return { state: "unavailable", percent: null };
  if (category.role_enabled === false) return { state: "off", percent: null };
  const head = headlineModel(category);
  const problem = category.tiers.some((t) => t.problem);
  if (problem) return { state: "problem", percent: null };
  if (!head) return { state: "unset", percent: null };
  switch (head.candidate.state) {
    case "installing": return { state: "downloading", percent: head.candidate.percent };
    case "failed": return { state: "failed", percent: null };
    case "notInstalled": return { state: "missing", percent: null };
    case "unsupported": return { state: "unavailable", percent: null };
    default: return { state: "ready", percent: null };
  }
}

export function toneOf(state: CardState): Tone {
  switch (state) {
    case "ready": return "ok";
    case "downloading": return "primary";
    case "problem": case "missing": return "warn";
    case "failed": return "bad";
    default: return "muted";
  }
}

/** The features that have a role (and so a priority), served first to last. Lower priority is served first; ties keep the page's own order. */
export function byPriority<T extends { priority: number | null }>(rows: readonly T[]): T[] {
  return rows.map((row, i) => ({ row, i })).sort((a, b) => (a.row.priority ?? 100) - (b.row.priority ?? 100) || a.i - b.i).map((x) => x.row);
}

/** The priorities to write so `role` moves one place up (-1) or down (+1). Everything is renumbered 10, 20, 30 so features that tied at the default become a real order; only changed values are returned. */
export function movePriority(rows: readonly { role: string; priority: number | null }[], role: string, dir: -1 | 1): Record<string, number> {
  const order = byPriority(rows).map((r) => r.role);
  const from = order.indexOf(role);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= order.length) return {};
  [order[from], order[to]] = [order[to]!, order[from]!];
  const changes: Record<string, number> = {};
  for (const [i, id] of order.entries()) {
    const next = (i + 1) * 10;
    if (rows.find((r) => r.role === id)?.priority !== next) changes[id] = next;
  }
  return changes;
}

/** `ids` with `id` moved one place; the same array when it cannot move. */
export function moveId(ids: readonly string[], id: string, dir: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

/** True while any model is downloading: the page asks again every few seconds until none is. */
export function anyInstalling(categories: readonly StackChoiceCategory[]): boolean {
  return categories.some((c) => c.candidates.some((m) => m.state === "installing"));
}

/** A lock for `category` or for one of its levels, from the host's `lockedItems` (key `chat` or `chat:boost`). The more specific key wins. */
export function lockFor(locked: Readonly<Record<string, string>> | undefined, category: string, level?: StackLevel): string | null {
  if (!locked) return null;
  return (level ? locked[`${category}:${level}`] : undefined) ?? locked[category] ?? null;
}

/** feature id to its plain name. */
export function categoryLabelIndex(categories: readonly StackChoiceCategory[]): Map<string, string> {
  return new Map(categories.map((c) => [c.id, c.label]));
}
