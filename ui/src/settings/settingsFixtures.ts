// The real spec files, read once, for the settings-shell tests: the same
// areas.json and key registry Home will render, so a test that passes here
// passes against what ships.
import areasFile from "../../../spec/settings/areas.json";
import keysFile from "../../../spec/settings/keys.json";
import type { SettingsKey } from "@maipai/spec/gen/ts/settings-key.js";
import type { ResolvedSetting } from "./resolvedSetting";
import type { SettingsAreaDef, SettingsViewer } from "./settingsAudience";

export const REGISTRY = keysFile as unknown as SettingsKey[];
export const AREAS = (areasFile as unknown as { areas: SettingsAreaDef[] }).areas;
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
