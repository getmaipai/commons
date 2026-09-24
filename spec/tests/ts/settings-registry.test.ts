// U2a (home/docs/plans/turn-machine-state-record-2026-09-22.md, "The
// setting"): turn.pipeline.next is declared once here, in
// spec/settings/keys.json, honoured by home and bot. fixtures.test.ts
// round-trips the one settings-key.example.json fixture through
// SettingsKey; nothing before this file round-tripped the real registry
// itself, so a hand-edit that broke another entry's shape would only
// surface downstream, in home's settingsRegistry.ts at boot. This file
// closes that gap (every entry in keys.json parses) and pins
// turn.pipeline.next's own declared shape. Default flipped to `true`
// at U6 (home/docs/dev.md "U6: the flip, decided", 2026-09-24) - the
// new engine is the one every household starts on now; the old path
// stays reachable (the key itself, set to false) until the plan's own
// section 2 deletions retire it.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SettingsKey } from "../../gen/ts/settings-key.js";

const REGISTRY_PATH = join(import.meta.dir, "..", "..", "settings", "keys.json");

function loadRegistry(): unknown[] {
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

describe("spec/settings/keys.json", () => {
  test("every entry parses as a SettingsKey", () => {
    const entries = loadRegistry();
    for (const entry of entries) {
      const key = (entry as { key?: unknown }).key;
      expect(() => SettingsKey.parse(entry), `entry "${String(key)}" failed SettingsKey.parse`).not.toThrow();
    }
  });

  test("every key is declared exactly once (one definition, one place)", () => {
    const entries = loadRegistry() as { key: string }[];
    const keys = entries.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("turn.pipeline.next: household, boolean, on by default (U6: the flip, decided), honoured by home and bot", () => {
    const entries = loadRegistry() as Record<string, unknown>[];
    const entry = entries.find((e) => e.key === "turn.pipeline.next");
    expect(entry).toBeDefined();
    const parsed = SettingsKey.parse(entry);
    expect(parsed.scope).toBe("household");
    expect(parsed.selector).toBe("boolean");
    expect(parsed.default).toBe(true);
    expect(parsed.level).toBe("advanced");
    expect(parsed.honoured_by).toEqual(["home", "bot"]);
  });
});
