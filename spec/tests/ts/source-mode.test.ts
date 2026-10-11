// KS-MODE-00: the search source mode is declared once in vocab/source-mode.json;
// the three registry keys draw their options and option copy from it.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SettingsKey } from "../../gen/ts/settings-key.js";
import { describeSetting, lintSettingCopy, type SettingDefinition } from "../../interpreters/ts/describeSetting.js";

const SPEC = join(import.meta.dir, "..", "..");

type Mode = {
  default: string;
  override_default: string;
  values: { value: string; label: string; copy: string; help: string }[];
  override_values: { value: string; label: string; copy: string }[];
  web_copy: Record<string, string>;
};
type Entry = SettingDefinition & { help?: string; lives_in: string; honoured_by: string[] };

const vocab = JSON.parse(readFileSync(join(SPEC, "vocab", "source-mode.json"), "utf-8")) as Mode;
const entries = JSON.parse(readFileSync(join(SPEC, "settings", "keys.json"), "utf-8")) as Entry[];
const find = (key: string): Entry => {
  const entry = entries.find((e) => e.key === key);
  if (!entry) throw new Error(`${key} is not declared`);
  return entry;
};
const modes = vocab.values.map((v) => v.value);
const overrideKeys = ["search.source_mode.wikimedia", "search.source_mode.web"];
const allKeys = ["search.source_mode", ...overrideKeys];

describe("KS-MODE-00 search source mode", () => {
  test("the vocab declares live, offline and mix once, with labels, copy and help", () => {
    expect([...modes].sort()).toEqual(["live", "mix", "offline"]);
    expect(vocab.default).toBe("mix");
    expect(vocab.override_default).toBe("inherit");
    for (const v of vocab.values) {
      expect(v.label.length, v.value).toBeGreaterThan(0);
      expect(v.copy.length, v.value).toBeGreaterThan(0);
      expect(v.help.length, v.value).toBeGreaterThan(0);
    }
  });

  test("every mode key's options equal the vocab", () => {
    expect(find("search.source_mode").range?.options).toEqual(modes);
    for (const key of overrideKeys) expect(find(key).range?.options, key).toEqual(["inherit", ...modes]);
  });

  test("the keys parse and carry the designed defaults, scope, home and level", () => {
    for (const key of allKeys) {
      const e = find(key);
      expect(() => SettingsKey.parse(e), key).not.toThrow();
      expect(e.scope, key).toBe("household");
      expect(e.selector, key).toBe("select");
      expect(e.lives_in, key).toBe("household.search");
      expect(e.honoured_by, key).toEqual(["home"]);
    }
    expect(find("search.source_mode").default).toBe(vocab.default);
    for (const key of overrideKeys) {
      expect(find(key).default, key).toBe(vocab.override_default);
      expect(find(key).level, key).toBe("advanced");
    }
  });

  test("the new keys sit right after search.searxng_url", () => {
    const keys = entries.map((e) => e.key);
    const at = keys.indexOf("search.searxng_url");
    expect(keys.slice(at + 1, at + 4)).toEqual(allKeys);
  });

  test("option copy comes from the vocab, not a second copy", () => {
    for (const key of ["search.source_mode", "search.source_mode.wikimedia"]) {
      const options = find(key).copy?.options ?? {};
      for (const v of vocab.values) expect(options[v.value], `${key} ${v.value}`).toBe(v.copy);
    }
    for (const key of overrideKeys) expect(find(key).copy?.options?.inherit).toBe(vocab.override_values[0]!.copy);
  });

  test("the web key's option copy describes web search, not the Wikipedia-style lookup", () => {
    const options = find("search.source_mode.web").copy?.options ?? {};
    for (const v of vocab.values) expect(options[v.value], v.value).toBe(vocab.web_copy[v.value]);
    expect(options.offline).toContain("Turns off web search");
    for (const line of Object.values(options)) expect(line).not.toContain("Wikipedia");
  });

  test("describeSetting gives plain words for all three keys and the copy lint passes", () => {
    for (const key of allKeys) {
      const setting = find(key);
      const described = describeSetting(setting, {
        subjectBand: "adult",
        viewer: "self",
        value: setting.default,
        source: "default",
        effective: setting.default,
      });
      expect(described.does, key).toBe(setting.copy?.does);
      expect(described.does.length, key).toBeGreaterThan(0);
    }
    expect(lintSettingCopy(entries.filter((e) => allKeys.includes(e.key)), [])).toEqual([]);
  });

  test("help says offline turns off only the live lookup and never implies live widens a minor", () => {
    const help = find("search.source_mode").help ?? "";
    expect(help).toContain("just the live Wikipedia-style lookup");
    expect(help).toContain("web search stays on unless web search is itself set to Library only");
    expect(help).toContain("never widens what they can reach");
    expect(vocab.values.find((v) => v.value === "offline")!.help).toContain("Web search stays on unless");
    for (const text of [vocab.values.find((v) => v.value === "live")!.help, vocab.values.find((v) => v.value === "live")!.copy]) {
      expect(text).not.toMatch(/\b(child|children|teen|teens|minor)\b[^.]*\b(more|wider|unlock|extra|reach)\b/i);
    }
    expect(vocab.values.find((v) => v.value === "live")!.help).toContain("nothing changes");
  });

  test("the retired search.wikipedia_fallback stays until the tag paired with KS-MODE-01", () => {
    expect(find("search.wikipedia_fallback")).toBeDefined();
  });
});
