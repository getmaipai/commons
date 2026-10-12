// SEARCH-SOURCES-01: a `select` key with `range.multiple` stores a list, so its
// default must be a non-empty subset of its options, and every option has a
// display name and a copy line (COPY-LINT-01).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SettingsKey } from "../../gen/ts/settings-key.js";
import { lintSettingCopy, type SettingDefinition } from "../../interpreters/ts/describeSetting.js";

const SPEC = join(import.meta.dir, "..", "..");
const entries = JSON.parse(readFileSync(join(SPEC, "settings", "keys.json"), "utf-8")) as (SettingDefinition & {
  range?: { options?: string[]; multiple?: boolean };
  copy?: { option_labels?: Record<string, string> };
})[];
const multi = entries.filter((e) => e.selector === "select" && e.range?.multiple === true);

describe("select + multiple keys", () => {
  test("search.web_sources is declared once as a multi-select", () => {
    const key = entries.filter((e) => e.key === "search.web_sources");
    expect(key).toHaveLength(1);
    expect(key[0]!.range).toEqual({ options: ["searxng", "ddgs"], multiple: true });
    expect(key[0]!.default).toEqual(["searxng"]);
    expect(key[0]!.copy?.option_labels).toEqual({ searxng: "SearXNG", ddgs: "DuckDuckGo" });
    expect(SettingsKey.parse(key[0]).key).toBe("search.web_sources");
  });

  test("every multi-select default is a subset of its options, non-empty except the adult blocked-site lists", () => {
    expect(multi.length).toBeGreaterThan(0);
    for (const e of multi) {
      const options = e.range!.options ?? [];
      expect(Array.isArray(e.default), e.key).toBe(true);
      const def = e.default as string[];
      // MINOR-SEARCH-01e-1: no blocked-site list is checked for adults until a parent picks one.
      if (e.key !== "search.blocklists.adult") expect(def.length, e.key).toBeGreaterThan(0);
      for (const v of def) expect(options, e.key).toContain(v);
      expect(new Set(def).size, e.key).toBe(def.length);
    }
  });

  test("every option has a display name and a copy line that passes the copy lint", () => {
    for (const e of multi) {
      for (const o of e.range!.options ?? []) {
        expect(e.copy?.option_labels?.[o], `${e.key} ${o}`).toBeTruthy();
        expect(e.copy?.options?.[o], `${e.key} ${o}`).toBeTruthy();
      }
    }
    expect(lintSettingCopy(multi, [])).toEqual([]);
  });
});
