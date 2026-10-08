// STATUS-MODEL-01: the shared status model. Pure and deterministic: no
// clock, no network, no locale. Home, the robot and Go render the same
// colors and words from vocab/status-model.json; this file is the TS
// reader, and fixtures/status-model/*.json is the contract any other
// runtime must reproduce.
import model from "../../vocab/status-model.json" with { type: "json" };

export type StatusState =
  | "running"
  | "starting"
  | "paused"
  | "down"
  | "limited"
  | "search_limited"
  | "waiting_internet"
  | "unknown";
export type StatusTone = "ok" | "info" | "warn" | "error" | "none";
export type StatusLength = "short" | "medium" | "long";
export type StatusAudience = "adult" | "teen" | "child" | "admin";
export type StatusCause =
  | "engine_stopped"
  | "engine_loading"
  | "engine_failed"
  | "engine_computer_disconnected"
  | "engine_computer_slow"
  | "memory_low"
  | "search_limited"
  | "internet_missing"
  | "optional_part_down"
  | "library_starting";
export type StatusSurface =
  | "rail_led"
  | "rail_tooltip"
  | "composer_line"
  | "app_header"
  | "status_page_badge"
  | "status_page_details"
  | "incident_banner"
  | "status_page_header"
  | "header_pill"
  | "profile_row"
  | "profile_led"
  | "profile_hover";

export interface StatusStateInfo {
  state: StatusState;
  severity: number;
  sticky: boolean;
  tone: StatusTone;
  problem: boolean;
}
export interface SurfaceInfo {
  length: StatusLength;
  summary: boolean;
  hidden_from_child: boolean;
}
export interface ServiceStatus {
  service: string;
  state: StatusState;
}
export interface StatusCopy {
  text: string;
  /** Repairs link text for an admin on paused or down, else null. */
  repairsLink: string | null;
}
export interface StatusSummary {
  /** Worst state among all statuses; "unknown" when none is known. */
  state: StatusState;
  tone: StatusTone;
  severity: number;
  /** Affected service names in sentence order (worst first, then code unit order). */
  affected: string[];
  /** One sentence at the asked length; null when every status is unknown. */
  text: string | null;
}
export interface SurfaceView extends StatusSummary {
  surface: StatusSurface;
  length: StatusLength;
  summary: boolean;
  repairsLink: string | null;
}

interface CopyBand {
  [state: string]: Partial<Record<StatusLength | "all", string | null>>;
}
const copy = model.copy as unknown as Record<string, CopyBand>;
const stateInfo = new Map<string, StatusStateInfo>(
  (model.states as StatusStateInfo[]).map((row) => [row.state, row]),
);
const causeState = new Map<string, StatusState>(
  (model.causes as Array<{ cause: StatusCause; state: StatusState }>).map((row) => [row.cause, row.state]),
);
const causeOrder = (model.causes as Array<{ cause: string }>).map((row) => row.cause);
const surfaces = model.surfaces as Record<string, SurfaceInfo>;
const predicates = model.summary.predicates as Record<string, { one: string; many: string }>;
const DEFAULT_SERVICE = model.default_service;

export const STATUS_STATES = (model.states as StatusStateInfo[]).map((row) => row.state);
export const STATUS_CAUSES = causeOrder as StatusCause[];
export const STATUS_SURFACES = Object.keys(surfaces) as StatusSurface[];
export const STATUS_LENGTHS = model.lengths as StatusLength[];
export const STATUS_AUDIENCES = model.audiences as StatusAudience[];

function info(state: StatusState): StatusStateInfo {
  const row = stateInfo.get(state);
  if (!row) throw new Error(`status state "${state}" is not in the status model`);
  return row;
}

export function stateInfoFor(state: StatusState): StatusStateInfo {
  return info(state);
}

/** The surface table row. A surface with no entry fails by name. */
export function surfaceInfo(surface: StatusSurface): SurfaceInfo {
  const row = surfaces[surface];
  if (!row) throw new Error(`status surface "${surface}" has no entry in the surface table`);
  return row;
}

/** The one state a cause maps to. */
export function stateForCause(cause: StatusCause): StatusState {
  const state = causeState.get(cause);
  if (!state) throw new Error(`status cause "${cause}" is not in the status model`);
  return state;
}

/**
 * A service's state from its causes: the worst cause by severity; a tie
 * keeps the cause listed first in the taxonomy. No causes is running.
 */
export function stateFromCauses(causes: readonly StatusCause[]): StatusState {
  let best: StatusCause | null = null;
  for (const cause of causes) {
    if (best === null) {
      best = cause;
      continue;
    }
    const diff = info(stateForCause(cause)).severity - info(stateForCause(best)).severity;
    if (diff > 0 || (diff === 0 && causeOrder.indexOf(cause) < causeOrder.indexOf(best))) best = cause;
  }
  return best === null ? "running" : stateForCause(best);
}

function fill(template: string, service: string): string {
  return template.split("{service}").join(service);
}

function repairsFor(state: StatusState, length: StatusLength, audience: StatusAudience): string | null {
  const rule = model.repairs;
  return audience === "admin" &&
    (rule.states as string[]).includes(state) &&
    (rule.lengths as string[]).includes(length)
    ? rule.label
    : null;
}

/**
 * The words for one state. Adult, teen and admin read their length; admin
 * is the adult wording plus the Repairs link text for paused and down at
 * medium and long. A child reads one short line at every length. Returns
 * null when there is nothing to show (unknown), or when a `surface` is
 * given that hides from a child and the state is a problem.
 */
export function statusCopy(
  state: StatusState,
  length: StatusLength,
  audience: StatusAudience,
  options: { service?: string; surface?: StatusSurface } = {},
): StatusCopy | null {
  const row = info(state);
  if (audience === "child" && options.surface && surfaceInfo(options.surface).hidden_from_child && row.problem) {
    return null;
  }
  const band = audience === "admin" ? "adult" : audience;
  const entry = copy[band]?.[state];
  if (!entry) throw new Error(`status copy missing for ${band}/${state}`);
  const template = band === "child" ? entry.all : entry[length];
  if (template === null || template === undefined) return null;
  return {
    text: fill(template, options.service ?? DEFAULT_SERVICE),
    repairsLink: repairsFor(state, length, audience),
  };
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Roll several services into one color and one sentence. The color is the
 * worst severity. Names are the services with a problem state, worst
 * first, then code unit order; a service listed twice keeps its worst
 * state. See `summary.note` in vocab/status-model.json for the sentence
 * rules (one shared state, mixed states, four or more collapse).
 */
export function summarize(statuses: readonly ServiceStatus[], length: StatusLength): StatusSummary {
  const worstByService = new Map<string, StatusStateInfo>();
  for (const status of statuses) {
    const row = info(status.state);
    const seen = worstByService.get(status.service);
    if (!seen || row.severity > seen.severity) worstByService.set(status.service, row);
  }
  const rows = [...worstByService.entries()]
    .map(([service, row]) => ({ service, row }))
    .sort((a, b) => b.row.severity - a.row.severity || byCodeUnit(a.service, b.service));
  const known = rows.filter((item) => item.row.state !== "unknown");
  const affected = rows.filter((item) => item.row.problem);
  const worst = known[0]?.row ?? info("unknown");
  const result = { state: worst.state, tone: worst.tone, severity: worst.severity, affected: affected.map((a) => a.service) };
  if (known.length === 0) return { ...result, text: null };
  if (affected.length === 0) return { ...result, text: model.summary.all_clear[length] };

  const tail = length === "short" ? "" : ".";
  if (affected.length >= model.summary.collapse_at && (model.summary.collapse_lengths as string[]).includes(length)) {
    return { ...result, text: model.summary.collapse_text.replace("{count}", String(affected.length)) + tail };
  }
  const groups = new Map<StatusState, string[]>();
  for (const item of affected) groups.set(item.row.state, [...(groups.get(item.row.state) ?? []), item.service]);
  if (groups.size > 1 && length !== "long") {
    return { ...result, text: model.summary.mixed_text.replace("{names}", joinNames(result.affected)) + tail };
  }
  const clauses = [...groups.entries()].map(([state, names]) => {
    const predicate = predicates[state];
    if (!predicate) throw new Error(`status summary has no predicate for "${state}"`);
    return `${joinNames(names)} ${names.length === 1 ? predicate.one : predicate.many}`;
  });
  return { ...result, text: clauses.join("; ") + tail };
}

/**
 * What one surface shows, from the surface table: its length, whether it
 * rolls up, and the child rule. A summary surface takes every status; a
 * single surface takes the statuses of its own service only (pass one).
 * Text is null when there is nothing to show or the child must see nothing.
 */
export function surfaceView(
  surface: StatusSurface,
  statuses: readonly ServiceStatus[],
  audience: StatusAudience,
): SurfaceView {
  const row = surfaceInfo(surface);
  let summary: StatusSummary;
  let repairsLink: string | null = null;
  if (row.summary) {
    summary = summarize(statuses, row.length);
    repairsLink = repairsFor(summary.state, row.length, audience);
  } else {
    if (statuses.length !== 1) throw new Error(`status surface "${surface}" shows one service, got ${statuses.length}`);
    const only = statuses[0] as ServiceStatus;
    const text = statusCopy(only.state, row.length, audience, { service: only.service, surface });
    const rowInfo = info(only.state);
    summary = {
      state: only.state,
      tone: rowInfo.tone,
      severity: rowInfo.severity,
      affected: rowInfo.problem ? [only.service] : [],
      text: text?.text ?? null,
    };
    repairsLink = text?.repairsLink ?? null;
  }
  if (audience === "child" && row.hidden_from_child && summary.severity > info("running").severity) {
    return { ...summary, surface, length: row.length, summary: row.summary, text: null, repairsLink: null };
  }
  return { ...summary, surface, length: row.length, summary: row.summary, repairsLink };
}
