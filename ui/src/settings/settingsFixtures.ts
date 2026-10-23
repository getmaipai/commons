// areas.legacy.json is a frozen snapshot of spec 0.1.217's areas, used only
// by kit behavior tests so product page reorganizations do not rewrite them.
// Tests of live product data import spec/settings/areas.json directly.
import legacyAreasFile from "./fixtures/areas.legacy.json";
import keysFile from "../../../spec/settings/keys.json";
import type { SettingsKey } from "@maipai/spec/gen/ts/settings-key.js";
import type { ResolvedSetting } from "./resolvedSetting";
import type { SettingsAreaDef, SettingsViewer } from "./settingsAudience";

export const REGISTRY = keysFile as unknown as SettingsKey[];
export const AREAS = (legacyAreasFile as unknown as { areas: SettingsAreaDef[] }).areas;
export const area = (id: string): SettingsAreaDef => AREAS.find((a) => a.id === id)!;

export const ADULT: SettingsViewer = { role: "adult", band: "adult", selfId: "p1" };
export const ADMIN: SettingsViewer = { role: "admin", band: "adult", selfId: "p1" };
export const TEEN: SettingsViewer = { role: "teen", band: "teen", selfId: "p2" };
export const CHILD: SettingsViewer = { role: "child", band: "child", selfId: "p3" };
export const GUEST: SettingsViewer = { role: "guest", band: "adult" };

/** A resolved value for every registry key at one scope (default value). */
export function valuesFor(scope: "household" | "person" | "device"): ResolvedSetting[] {
  return REGISTRY.filter((k) => k.scope === scope).map((k) => ({
    key: k.key,
    value: k.default,
    source: "default",
    label: k.label,
    level: k.level as ResolvedSetting["level"],
    secret: k.secret,
  }));
}
