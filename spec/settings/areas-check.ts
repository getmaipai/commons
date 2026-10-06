// Cross-file conformance for spec/settings/areas.json against the registry
// (spec/settings/keys.json). JSON Schema checks one area's shape; this checks
// what a schema cannot: that every registry key has exactly one card, that
// expert keys sit only under a developer section, that ids are unique, and
// that no card or section is broader than its area. Returns plain-language
// violations; an empty array means the file conforms.
import schema from "../schemas/settings-area.schema.json" with { type: "json" };

export type Role = "owner" | "admin" | "adult" | "teen" | "child" | "guest";
export type Band = "child" | "teen" | "adult";
export type Level = "basic" | "advanced" | "expert";
export type Scope = "household" | "person" | "device";

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
export interface AreaSection {
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
  order?: number;
  min_role?: Role;
  bands?: Band[];
  needs?: string[];
}
export interface SettingsArea {
  id: string;
  title: string;
  app?: string;
  audience: { min_role: Role };
  groups: { label: string; sections: string[] }[];
  sections: AreaSection[];
}
export interface NotPlaced { scope: Scope; group: string; reason: string }
export interface AreasFile { areas: SettingsArea[]; not_placed: NotPlaced[] }
export interface RegistryKey { key: string; scope: Scope; level: Level; lives_in: string }

const defs = schema.$defs;
/** Static legacy routes under /settings that an area id may never equal. */
export const RESERVED_AREA_IDS: readonly string[] = defs.reservedIds.enum;
/** The areas declared centrally in areas.json; a package may not reuse them. */
export const CENTRAL_AREA_IDS: readonly string[] = ["account", "home", "chat"];
/** The views Home's view table renders. */
export const ALLOWED_VIEW_IDS: readonly string[] = defs.view.enum;
export const ROLES: readonly Role[] = defs.role.enum as Role[];

const DEFAULT_LEVELS: Level[] = ["basic", "advanced"];
const rank = (r: Role) => ROLES.indexOf(r);

export function checkAreas(file: AreasFile, registry: RegistryKey[]): string[] {
  const errors: string[] = [];
  const registryGroups = new Set(registry.map((k) => `${k.scope}:${k.lives_in}`));
  const areaIds = new Set<string>();

  // (scope:group:level) -> where it is drawn
  const drawn = new Map<string, string[]>();

  for (const area of file.areas) {
    if (areaIds.has(area.id)) errors.push(`duplicate area "${area.id}"`);
    areaIds.add(area.id);
    if (RESERVED_AREA_IDS.includes(area.id)) errors.push(`area id "${area.id}" is reserved`);

    const sectionIds = new Set<string>();
    for (const s of area.sections) {
      if (sectionIds.has(s.id)) errors.push(`${area.id}: duplicate section "${s.id}"`);
      sectionIds.add(s.id);
    }
    const listed = new Map<string, number>();
    for (const g of area.groups) {
      for (const id of g.sections) {
        if (!sectionIds.has(id)) errors.push(`${area.id}: sidebar group "${g.label}" names unknown section "${id}"`);
        listed.set(id, (listed.get(id) ?? 0) + 1);
      }
    }
    for (const id of sectionIds) {
      const n = listed.get(id) ?? 0;
      if (n === 0) errors.push(`${area.id}: section "${id}" is not in any sidebar group`);
      if (n > 1) errors.push(`${area.id}: section "${id}" is in more than one sidebar group`);
    }

    for (const s of area.sections) {
      const where = `${area.id}/${s.id}`;
      if (s.kind === "keys" && !s.cards?.length) errors.push(`${where}: a keys section needs cards`);
      if (s.kind === "view" && !s.view) errors.push(`${where}: a view section needs a view`);
      if (s.kind === "link" && !s.href) errors.push(`${where}: a link section needs an href`);
      if (s.kind === "keys" && (s.view || s.href)) errors.push(`${where}: a keys section holds no view or href`);
      if (s.kind === "view" && (s.cards || s.href || s.lead_view || s.trail_view)) errors.push(`${where}: a view section holds only a view`);
      if (s.kind === "link" && (s.cards || s.view || s.lead_view || s.trail_view)) errors.push(`${where}: a link section holds only an href`);
      for (const v of [s.view, s.lead_view, s.trail_view]) {
        if (v !== undefined && !ALLOWED_VIEW_IDS.includes(v)) errors.push(`${where}: unknown view "${v}"`);
      }
      if (s.min_role && rank(s.min_role) > rank(area.audience.min_role)) {
        errors.push(`${where}: min_role ${s.min_role} is broader than the area's ${area.audience.min_role}`);
      }
      for (const c of s.cards ?? []) {
        if (c.min_role && rank(c.min_role) > rank(area.audience.min_role)) {
          errors.push(`${where}: card "${c.label}" min_role ${c.min_role} is broader than the area's ${area.audience.min_role}`);
        }
        for (const l of c.links ?? []) checkHref(`${where}: link "${l.label}"`, l.href, errors);
        if (c.links && (c.group || c.scope || c.levels)) errors.push(`${where}: card "${c.label}" is a link card, so it has no group, scope or levels`);
        if (!c.links && !(c.group && c.scope)) errors.push(`${where}: card "${c.label}" needs a group and scope, or links`);
        if (!c.group || !c.scope) continue;
        const levels = c.levels ?? DEFAULT_LEVELS;
        const has = (lv: Level) => levels.includes(lv);
        if (has("expert") && s.id !== "developer") {
          errors.push(`${where}: card "${c.label}" draws expert keys outside a developer section`);
        }
        if (s.id === "developer" && (levels.length !== 1 || !has("expert"))) {
          errors.push(`${where}: a developer card draws expert keys only (card "${c.label}")`);
        }
        if (!registryGroups.has(`${c.scope}:${c.group}`)) {
          errors.push(`${where}: card "${c.label}" group ${c.group} at ${c.scope} is not in the registry`);
          continue;
        }
        for (const lv of levels) {
          const id = `${c.scope}:${c.group}:${lv}`;
          drawn.set(id, [...(drawn.get(id) ?? []), where]);
        }
      }
      if (s.href) checkHref(where, s.href, errors);
    }
  }

  const notPlaced = new Set(file.not_placed.map((n) => `${n.scope}:${n.group}`));
  for (const n of file.not_placed) {
    if (!registryGroups.has(`${n.scope}:${n.group}`)) errors.push(`not_placed ${n.scope}:${n.group} is not in the registry`);
    if (n.reason.trim().length < 10) errors.push(`not_placed ${n.scope}:${n.group} needs a reason`);
  }

  const seen = new Set<string>();
  for (const k of registry) {
    const id = `${k.scope}:${k.lives_in}:${k.level}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const cards = drawn.get(id) ?? [];
    const parked = notPlaced.has(`${k.scope}:${k.lives_in}`);
    if (parked) {
      if (cards.length > 0) errors.push(`${k.scope}:${k.lives_in} is listed as not placed and also has a card at ${cards.join(", ")}`);
      continue;
    }
    if (cards.length === 0) {
      errors.push(
        k.level === "expert"
          ? `${k.scope}:${k.lives_in}: expert key ${k.key} is in no developer card`
          : `${k.scope}:${k.lives_in} (${k.level}): no card draws ${k.key}`,
      );
    }
    if (cards.length > 1) errors.push(`${k.scope}:${k.lives_in} (${k.level}) is in more than one card: ${cards.join(", ")}`);
  }
  return errors;
}

/**
 * The manifest lint for SPEC-SETAREA-01. A package id may not equal a reserved
 * legacy route id (its pages would collide with /settings/<id>), and a
 * package's settings area may not take a reserved id or a central one
 * (account, home, chat). Kept here, not as a schema `not`, because a `not`
 * makes the generated models drop the id pattern.
 */
export function lintManifestSettings(manifest: { id: string; contributes?: { settings_area?: { id: string } } }): string[] {
  const errors: string[] = [];
  if (RESERVED_AREA_IDS.includes(manifest.id)) errors.push(`package id "${manifest.id}" is a reserved settings route`);
  const area = manifest.contributes?.settings_area;
  if (area) {
    if (RESERVED_AREA_IDS.includes(area.id)) errors.push(`settings area id "${area.id}" is reserved`);
    if (CENTRAL_AREA_IDS.includes(area.id)) errors.push(`settings area id "${area.id}" belongs to a central area`);
  }
  return errors;
}

function checkHref(where: string, href: string, errors: string[]): void {
  if (!href.startsWith("/")) errors.push(`${where}: href "${href}" is not an in-app path`);
  if (/[{}]/.test(href.replaceAll("{self}", ""))) errors.push(`${where}: href "${href}" holds a placeholder other than {self}`);
}
