import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SettingsKey } from "../../gen/ts/settings-key.js";
import { describeSetting } from "../../interpreters/ts/describeSetting.js";

const SPEC = join(import.meta.dir, "..", "..");
const registry = JSON.parse(readFileSync(join(SPEC, "settings", "keys.json"), "utf8")) as Record<string, any>[];
const areas = JSON.parse(readFileSync(join(SPEC, "settings", "areas.json"), "utf8"));

describe("ui.home_layout", () => {
  const matches = registry.filter((row) => row.key === "ui.home_layout");

  test("declares the Home layout options and child defaults", () => {
    expect(matches).toHaveLength(1);
    const entry = SettingsKey.parse(matches[0]);
    expect(entry).toMatchObject({
      scope: "person",
      selector: "select",
      range: { options: ["shelves", "ask", "board"] },
      default: "shelves",
      layers: ["band", "household", "person"],
      band_default: { child: "ask", teen: "shelves", adult: "shelves" },
      control: { child: "guardian", teen: "self", adult: "self" },
      lives_in: "profile.appearance",
      level: "basic",
      secret: false,
      honoured_by: ["home"],
    });
    for (const option of ["shelves", "ask", "board"]) expect(entry.range?.options).toContain(option);
    expect(entry.range?.options).not.toContain("grid");
    expect(entry.range?.options).not.toContain("");
    expect(entry.self_service).toBeUndefined();
  });

  test("appears once in the Appearance group and describes the child lock", () => {
    const entry = SettingsKey.parse(matches[0]);
    const appearance = areas.areas[0].sections.find((section: { id: string }) => section.id === "appearance");
    const rows = registry.filter((row) => row.lives_in === "profile.appearance");
    expect(rows.filter((row) => row.key === "ui.home_layout")).toHaveLength(1);
    expect(appearance.cards.some((card: { group: string }) => card.group === "profile.appearance")).toBe(true);
    expect(describeSetting(entry, {
      subjectBand: "child",
      viewer: "self",
      value: "ask",
      source: "default",
      effective: "ask",
    })).toMatchObject({
      does: "Home keeps the simple arrangement.",
      state: "ask",
    });
  });
});
