import type { SettingsKey } from "@maipai/spec/gen/ts/settings-key.js";
import type { MergedSetting } from "./groupSettings";
import type { ResolvedSetting } from "./resolvedSetting";
import { localeDisplayName, titleCaseOption } from "./optionLabels";
import { areaAllows, audienceAllows, cardKeys, type Scope, type SettingsAreaDef, type SettingsViewer } from "./settingsAudience";

/** The resolved values the host has loaded, one list per scope an area
 * reads: a key is searchable only once its value is here. */
export type ScopedValues = Partial<Record<Scope, readonly ResolvedSetting[]>>;

export interface SettingsSearchResult {
  sectionId: string;
  sectionLabel: string;
  cardLabel: string;
  /** "Section / Card", the breadcrumb heading the results list groups under. */
  breadcrumb: string;
  setting: MergedSetting;
}

function optionWords(def: SettingsKey): string[] {
  const options = (def.range as { options?: string[] } | undefined)?.options ?? [];
  const label = def.key === "household.locale" ? localeDisplayName : titleCaseOption;
  return options.flatMap((o) => [o, label(o)]);
}

/** Searches ONE area, only over what the viewer may see. Every word of the
 * query must appear in the key's label, help text or option labels (a direct
 * match). Only when no key matches directly does the query fall back to the
 * section's label and keywords, and then every visible key of a matching
 * section is a result (so "photos" can open the Chat section's keys without
 * a row literally saying photos). A key the viewer may not see
 * (hidden section, hidden card, expert level outside a developer card,
 * another product's key, no value loaded) never appears: not as a result,
 * not in a breadcrumb. A blank query returns nothing. Results come in the
 * area's own order and each key once. */
export function searchSettings(
  area: SettingsAreaDef,
  registry: readonly SettingsKey[],
  values: ScopedValues,
  viewer: SettingsViewer,
  query: string,
  options: { honouredBy?: string } = {},
): SettingsSearchResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0 || !areaAllows(area, viewer)) return [];
  const byId = new Map(area.sections.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const direct: SettingsSearchResult[] = [];
  const bySection: SettingsSearchResult[] = [];

  for (const group of area.groups) {
    for (const id of group.sections) {
      const section = byId.get(id);
      if (!section || section.kind !== "keys" || !audienceAllows(viewer, section)) continue;
      for (const card of section.cards ?? []) {
        if (!audienceAllows(viewer, card) || !card.group || !card.scope) continue;
        const valueByKey = new Map((values[card.scope] ?? []).map((v) => [v.key, v]));
        for (const def of cardKeys(card, registry, options.honouredBy)) {
          const resolved = valueByKey.get(def.key);
          if (!resolved || seen.has(def.key)) continue;
          const keyText = [def.label, def.help ?? "", ...optionWords(def)].join(" ").toLowerCase();
          const sectionText = [section.label, ...(section.keywords ?? [])].join(" ").toLowerCase();
          const isDirect = words.every((w) => keyText.includes(w));
          if (!isDirect && !words.every((w) => sectionText.includes(w))) continue;
          seen.add(def.key);
          (isDirect ? direct : bySection).push({
            sectionId: section.id,
            sectionLabel: section.label,
            cardLabel: card.label,
            breadcrumb: `${section.label} / ${card.label}`,
            setting: { def, resolved },
          });
        }
      }
    }
  }
  return direct.length > 0 ? direct : bySection;
}
