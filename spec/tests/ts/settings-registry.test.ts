// Round-trip the real registry through SettingsKey. A hand-edit that
// breaks an entry's shape would otherwise surface downstream in a
// consumer at boot.
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

  test("the retired turn pipeline toggle is absent", () => {
    const entries = loadRegistry() as Record<string, unknown>[];
    expect(entries.some((e) => e.key === "turn.pipeline.next")).toBe(false);
  });
});
