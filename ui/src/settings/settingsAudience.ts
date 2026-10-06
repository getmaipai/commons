import type { SettingsArea } from "@maipai/spec/gen/ts/settings-area.js";
import type { SettingsKey } from "@maipai/spec/gen/ts/settings-key.js";

// Who may see what in a settings area (KIT-SET-02). Pure functions, no
// React: the shell, `searchSettings()` and the host's route redirects all
// ask the same questions here, so a section, card or key the viewer may not
// see is hidden the same way everywhere. This is presentation only; the
// server re-checks every write.

export type Role = SettingsArea["audience"]["min_role"];
export type Band = "child" | "teen" | "adult";
export type Scope = "household" | "person" | "device";
export type Level = "basic" | "advanced" | "expert";

// The generated spec type leaves `sections` as `any[]` (zod cannot infer
// through the schema's $defs), so the section, card and link shapes are
// written out here exactly as spec/schemas/settings-area.schema.json
// declares them; the area type below swaps them in. The schema stays the
// one definition: a change there is a change here.
export interface AreaLink { label: string; href: string; icon?: string; min_role?: Role }
export interface AreaCard {
  label: string;
  group?: string;
  scope?: Scope;
  levels?: Level[];
  links?: AreaLink[];
  collapsed?: boolean;
  order?: number;
  min_role?: Role;
  bands?: Band[];
  needs?: string[];
}
export interface Section {
  id: string;
  label: string;
  icon: string;
  kind: "keys" | "view" | "link";
  cards?: AreaCard[];
  lead_view?: string;
  trail_view?: string;
  view?: string;
  href?: string;
  keywords?: string[];
  min_role?: Role;
  bands?: Band[];
  needs?: string[];
}
export type Card = AreaCard;
/** A settings area as the kit reads it: the spec's `SettingsArea` with its
 * sections typed. */
export type SettingsAreaDef = Omit<SettingsArea, "sections"> & { sections: Section[] };

/** The role ladder, most to least privileged (the spec's own order). */
export const ROLE_LADDER: readonly Role[] = ["owner", "admin", "adult", "teen", "child", "guest"];

export interface SettingsViewer {
  role: Role;
  band: Band;
  /** The capability ids the viewer's home satisfies (`needs` on a section or
   * card: `robot.paired`, `wakeword.assets`, `household.has_child`). A need
   * not listed here is unmet. */
  capabilities?: readonly string[];
  /** The viewer's own person id, for the `{self}` placeholder in a link href. */
  selfId?: string;
}

export interface Gated {
  min_role?: Role;
  bands?: readonly Band[];
  needs?: readonly string[];
}

/** The lowest role that may see a thing: the viewer's rank is at or above it. */
export function roleAllows(viewer: SettingsViewer, minRole: Role | undefined): boolean {
  if (!minRole) return true;
  return ROLE_LADDER.indexOf(viewer.role) <= ROLE_LADDER.indexOf(minRole);
}

/** True when the viewer may see something gated by role, band and needs. */
export function audienceAllows(viewer: SettingsViewer, gate: Gated): boolean {
  if (!roleAllows(viewer, gate.min_role)) return false;
  if (gate.bands && gate.bands.length > 0 && !gate.bands.includes(viewer.band)) return false;
  if (gate.needs && gate.needs.some((need) => !(viewer.capabilities ?? []).includes(need))) return false;
  return true;
}

export function areaAllows(area: SettingsAreaDef, viewer: SettingsViewer): boolean {
  return roleAllows(viewer, area.audience.min_role);
}

const DEFAULT_LEVELS: readonly Level[] = ["basic", "advanced"];

/** The registry keys one card draws: its group at its scope, at the levels it
 * allows (basic and advanced unless the card says otherwise; expert only in
 * a developer card), and honoured by the asking product when one is named. */
export function cardKeys(card: Card, registry: readonly SettingsKey[], honouredBy?: string): SettingsKey[] {
  if (!card.group || !card.scope) return [];
  const levels: readonly Level[] = card.levels ?? DEFAULT_LEVELS;
  return registry.filter(
    (k) =>
      k.scope === card.scope &&
      k.lives_in === card.group &&
      levels.includes(k.level as Level) &&
      (!honouredBy || (k.honoured_by as string[]).includes(honouredBy)),
  );
}

/** Cards of a section the viewer may see. With a registry, a key card with
 * no key to draw is hidden too, and a link card keeps only the links the
 * viewer's role allows. */
export function visibleCards(section: Section, viewer: SettingsViewer, registry?: readonly SettingsKey[], honouredBy?: string): Card[] {
  const out: Card[] = [];
  for (const card of section.cards ?? []) {
    if (!audienceAllows(viewer, card)) continue;
    if (card.links) {
      const links = card.links.filter((l: AreaLink) => roleAllows(viewer, l.min_role));
      if (links.length === 0) continue;
      out.push({ ...card, links });
      continue;
    }
    if (registry && cardKeys(card, registry, honouredBy).length === 0) continue;
    out.push(card);
  }
  return out;
}

export function sectionVisible(section: Section, viewer: SettingsViewer, registry?: readonly SettingsKey[], honouredBy?: string): boolean {
  if (!audienceAllows(viewer, section)) return false;
  if (section.kind !== "keys") return true;
  // A keys section is hidden when it has no visible card and no view of its own.
  return visibleCards(section, viewer, registry, honouredBy).length > 0 || Boolean(section.lead_view || section.trail_view);
}

export interface VisibleGroup {
  label: string;
  sections: Section[];
}

/** The sidebar groups with only the sections the viewer may see, in the
 * area's own order; a group left empty is dropped. An area the viewer may
 * not see at all has none. */
export function visibleGroups(area: SettingsAreaDef, viewer: SettingsViewer, registry?: readonly SettingsKey[], honouredBy?: string): VisibleGroup[] {
  if (!areaAllows(area, viewer)) return [];
  const byId = new Map(area.sections.map((s) => [s.id, s]));
  const out: VisibleGroup[] = [];
  for (const group of area.groups) {
    const sections = group.sections
      .map((id) => byId.get(id))
      .filter((s): s is Section => s !== undefined && sectionVisible(s, viewer, registry, honouredBy));
    if (sections.length > 0) out.push({ label: group.label, sections });
  }
  return out;
}

/** The first section a viewer may open that holds content here (not a link
 * out): where `/settings/<area>` lands. Undefined when there is none. */
export function firstVisibleSection(area: SettingsAreaDef, viewer: SettingsViewer, registry?: readonly SettingsKey[], honouredBy?: string): Section | undefined {
  for (const group of visibleGroups(area, viewer, registry, honouredBy)) {
    const found = group.sections.find((s) => s.kind !== "link");
    if (found) return found;
  }
  return undefined;
}

/** Resolves the one placeholder a link href may carry. */
export function resolveHref(href: string, viewer: SettingsViewer): string {
  return href.replace("{self}", encodeURIComponent(viewer.selfId ?? ""));
}
