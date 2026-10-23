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
  matrix?: AreaMatrix;
  tab?: string;
}
export interface AreaTab { id: string; label: string }
export interface AreaDetail { param: string; view: string; tabs?: AreaTab[] }
export interface AreaMatrixColumn { label: string; key: string; band: Band }
export interface AreaMatrix { rows: string; rows_label?: string; columns: AreaMatrixColumn[]; locked_note?: string; unavailable_note?: string; save_error?: string }
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
  tabs?: AreaTab[];
  view_tab?: string;
  detail?: AreaDetail;
}
export interface SettingsArea {
  id: string;
  title: string;
  app?: string;
  audience: { min_role: Role };
  scope: "household" | "person";
  groups: { label: string; sections: string[] }[];
  sections: AreaSection[];
}
export interface NotPlaced { scope: Scope; group: string; reason: string }
export interface DeviceCard { device_kind: "robot"; label: string; group: string; scope: "device"; min_role: Role }
export interface AreasFile { areas: SettingsArea[]; not_placed: NotPlaced[]; device_cards: DeviceCard[] }
export interface RegistryKey { key: string; scope: Scope; level: Level; lives_in: string }

const defs = schema.$defs;
/** Static legacy routes under /settings that an area id may never equal. */
export const RESERVED_AREA_IDS: readonly string[] = defs.reservedIds.enum;
/** The areas declared centrally in areas.json; a package may not reuse them. */
export const CENTRAL_AREA_IDS: readonly string[] = ["account", "home", "chat"];
/** The views Home's view table renders. */
export const ALLOWED_VIEW_IDS: readonly string[] = defs.view.enum;
export const ROLES: readonly Role[] = defs.role.enum as Role[];

/** Package household cards currently allowed by IA-02; each later slice only removes entries. */
/** Expert groups a non-developer section may draw (a Home page that has always shown one expert key, Network's hub port). Only shrinks. */
export const EXPERT_OUTSIDE_DEVELOPER: readonly string[] = ["household.network_port"];

export const HOUSEHOLD_CARD_ALLOWLIST: readonly string[] = ["news"];
export const PAGE_COUNT_ENFORCED = false;
export const SETTINGS_CAP_ENFORCED = false;
export function checkPageCount(area: SettingsArea): string[] {
  if (!PAGE_COUNT_ENFORCED || (area.id !== "home" && area.id !== "account")) return [];
  const pages = area.sections.filter((s) => !s.min_role || rank(s.min_role) <= rank(area.audience.min_role));
  return pages.length < 6 || pages.length > 9 ? [`${area.id}: must have 6 to 9 visible pages (found ${pages.length})`] : [];
}
export function checkSettingsCap(section: AreaSection, registry: RegistryKey[]): string[] {
  if (!SETTINGS_CAP_ENFORCED) return [];
  const tabs = section.tabs?.length ? [...section.tabs.map((t) => t.id), "__summary__"] : ["__summary__"];
  const errors: string[] = [];
  for (const tab of tabs) {
    const sectionViews = tab === "__summary__" && (section.view || section.lead_view || section.trail_view) ? 1 : 0;
    const count = sectionViews + (section.cards ?? []).filter((c) => (c.tab ?? "__summary__") === tab).reduce((n, c) => {
      if (!c.group || !c.scope) return n;
      return n + registry.filter((k) => k.scope === c.scope && k.lives_in === c.group && k.level === "basic").length;
    }, 0);
    if (count > 10) errors.push(`${section.id}: tab "${tab}" has more than 10 visible basic settings`);
  }
  return errors;
}

const DEFAULT_LEVELS: Level[] = ["basic", "advanced"];
const rank = (r: Role) => ROLES.indexOf(r);

export function checkAreas(file: AreasFile, registry: RegistryKey[]): string[] {
  const errors: string[] = [];
  const registryGroups = new Set(registry.map((k) => `${k.scope}:${k.lives_in}`));
  const areaIds = new Set<string>();

  // A whole registry group has one placement, regardless of its key levels.
  const drawn = new Map<string, string[]>();

  for (const area of file.areas) {
    if (areaIds.has(area.id)) errors.push(`duplicate area "${area.id}"`);
    areaIds.add(area.id);
    if (RESERVED_AREA_IDS.includes(area.id)) errors.push(`area id "${area.id}" is reserved`);
    if (area.scope === "household" && rank(area.audience.min_role) > rank("admin")) {
      errors.push(`${area.id}: household area min_role ${area.audience.min_role} is broader than admin`);
    }

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
      const validTabIds = new Set((s.tabs ?? []).map((tab) => tab.id));
      if (s.tabs && (s.tabs.length < 2 || s.tabs.length > 5)) errors.push(`${where}: tabs must contain 2 to 5 entries`);
      if (new Set(validTabIds).size !== (s.tabs?.length ?? 0)) errors.push(`${where}: tab ids must be unique`);
      if (s.view_tab && !validTabIds.has(s.view_tab)) errors.push(`${where}: view_tab "${s.view_tab}" is not a tab id of the section`);
      if (s.detail) {
        if (!/^[a-z][a-z0-9_]*$/.test(s.detail.param)) errors.push(`${where}: detail param must be a simple path parameter`);
        if (!ALLOWED_VIEW_IDS.includes(s.detail.view)) errors.push(`${where}: unknown detail view "${s.detail.view}"`);
        if (s.detail.tabs && (s.detail.tabs.length < 2 || s.detail.tabs.length > 5)) errors.push(`${where}: detail tabs must contain 2 to 5 entries`);
        if (s.detail.tabs && new Set(s.detail.tabs.map((tab) => tab.id)).size !== s.detail.tabs.length) errors.push(`${where}: detail tab ids must be unique`);
      }
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
        if (c.tab && !validTabIds.has(c.tab)) errors.push(`${where}: card "${c.label}" tab "${c.tab}" is not a tab id of the section`);
        if (c.min_role && rank(c.min_role) > rank(area.audience.min_role)) {
          errors.push(`${where}: card "${c.label}" min_role ${c.min_role} is broader than the area's ${area.audience.min_role}`);
        }
        for (const l of c.links ?? []) checkHref(`${where}: link "${l.label}"`, l.href, errors);
        if (c.links && (c.group || c.scope || c.levels)) errors.push(`${where}: card "${c.label}" is a link card, so it has no group, scope or levels`);
        if (!c.links && !(c.group && c.scope)) errors.push(`${where}: card "${c.label}" needs a group and scope, or links`);
        if (!c.group || !c.scope) continue;
        const deviceException = c.scope === "device" && area.scope === "person" && (s.id === "device" || s.id === "robot");
        if (c.scope !== area.scope && !deviceException) errors.push(`${where}: card "${c.label}" scope ${c.scope} disagrees with area's ${area.scope} scope`);
        const levels = c.levels ?? DEFAULT_LEVELS;
        const groupLevels = new Set(registry.filter((k) => k.scope === c.scope && k.lives_in === c.group).map((k) => k.level));
        const has = (lv: Level) => levels.includes(lv);
        const expertOutside = EXPERT_OUTSIDE_DEVELOPER.includes(c.group) && s.id !== "developer" && levels.length === 1 && has("expert");
        if (groupLevels.has("expert") && !expertOutside && (s.id !== "developer" || levels.length !== 1 || !has("expert"))) {
          errors.push(`${where}: card "${c.label}" contains expert keys outside a developer section or mixes expert levels`);
        }
        if (s.id === "developer" && (!groupLevels.has("expert") || levels.length !== 1 || !has("expert"))) {
          errors.push(`${where}: a developer card draws expert keys only (card "${c.label}")`);
        }
        if (!registryGroups.has(`${c.scope}:${c.group}`)) {
          errors.push(`${where}: card "${c.label}" group ${c.group} at ${c.scope} is not in the registry`);
          continue;
        }
        if (c.matrix) {
          const bands = new Set<string>();
          const keys = new Set<string>();
          for (const col of c.matrix.columns) {
            const k = registry.find((r) => r.key === col.key);
            if (!k) errors.push(`${where}: card "${c.label}" matrix column "${col.label}" names ${col.key}, which is not in the registry`);
            else if (k.scope !== c.scope || k.lives_in !== c.group) errors.push(`${where}: card "${c.label}" matrix column "${col.label}" key ${col.key} must live in ${c.scope}:${c.group}`);
            if (bands.has(col.band)) errors.push(`${where}: card "${c.label}" matrix has two columns for ${col.band}`);
            if (keys.has(col.key)) errors.push(`${where}: card "${c.label}" matrix names ${col.key} twice`);
            bands.add(col.band);
            keys.add(col.key);
          }
        }
        const id = `${c.scope}:${c.group}`;
        drawn.set(id, [...(drawn.get(id) ?? []), `${where}${c.tab ? `?tab=${c.tab}` : ""}`]);
      }
      if (s.tabs) for (const tab of s.tabs) {
        if (!(s.cards ?? []).some((c) => c.tab === tab.id) && s.view_tab !== tab.id) errors.push(`${where}: tab "${tab.id}" holds nothing`);
      }
      errors.push(...checkSettingsCap(s, registry).map((e) => `${where}: ${e}`));
      if (s.href) checkHref(where, s.href, errors);
    }
  }

  for (const card of file.device_cards ?? []) {
    const where = `device_cards/${card.device_kind}`;
    if (card.scope !== "device") errors.push(`${where}: device card group ${card.group} must have device scope`);
    if (!registryGroups.has(`${card.scope}:${card.group}`)) {
      errors.push(`${where}: group ${card.group} at ${card.scope} is not in the registry`);
      continue;
    }
    const id = `${card.scope}:${card.group}`;
    drawn.set(id, [...(drawn.get(id) ?? []), where]);
  }

  const notPlaced = new Set(file.not_placed.map((n) => `${n.scope}:${n.group}`));
  for (const n of file.not_placed) {
    if (!registryGroups.has(`${n.scope}:${n.group}`)) errors.push(`not_placed ${n.scope}:${n.group} is not in the registry`);
    if (n.reason.trim().length < 10) errors.push(`not_placed ${n.scope}:${n.group} needs a reason`);
  }

  const seen = new Set<string>();
  for (const k of registry) {
    const id = `${k.scope}:${k.lives_in}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const cards = drawn.get(id) ?? [];
    const parked = notPlaced.has(id);
    if (parked) {
      if (cards.length > 0) errors.push(`${k.scope}:${k.lives_in} is listed as not placed and also has a card at ${cards.join(", ")}`);
      continue;
    }
    if (cards.length === 0) errors.push(`${id}: no card draws registry group ${k.lives_in}`);
    if (cards.length > 1) errors.push(`${id} is in more than one card: ${cards.join(", ")}`);
  }
  for (const area of file.areas) errors.push(...checkPageCount(area));
  return errors;
}

/**
 * The manifest lint for SPEC-SETAREA-01. A package id may not equal a reserved
 * legacy route id (its pages would collide with /settings/<id>), and a
 * package's settings area may not take a reserved id or a central one
 * (account, home, chat). Kept here, not as a schema `not`, because a `not`
 * makes the generated models drop the id pattern.
 */
export function lintManifestSettings(manifest: { id: string; contributes?: { settings_area?: SettingsArea } }): string[] {
  const errors: string[] = [];
  if (RESERVED_AREA_IDS.includes(manifest.id)) errors.push(`package id "${manifest.id}" is a reserved settings route`);
  const area = manifest.contributes?.settings_area;
  if (area) {
    if (RESERVED_AREA_IDS.includes(area.id)) errors.push(`settings area id "${area.id}" is reserved`);
    if (CENTRAL_AREA_IDS.includes(area.id)) errors.push(`settings area id "${area.id}" belongs to a central area`);
    if (area.sections.some((s) => s.cards?.some((c) => c.scope === "household")) && !HOUSEHOLD_CARD_ALLOWLIST.includes(manifest.id)) {
      errors.push(`package "${manifest.id}" settings area may not declare household cards`);
    }
  }
  return errors;
}

function checkHref(where: string, href: string, errors: string[]): void {
  if (!href.startsWith("/")) errors.push(`${where}: href "${href}" is not an in-app path`);
  if (/[{}]/.test(href.replaceAll("{self}", ""))) errors.push(`${where}: href "${href}" holds a placeholder other than {self}`);
}
