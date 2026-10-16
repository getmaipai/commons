import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { lintSettingCopy, type SettingDefinition } from "../../interpreters/ts/describeSetting.js";

const SPEC = join(import.meta.dir, "..", "..");
const load = <T>(path: string): T => JSON.parse(readFileSync(join(SPEC, path), "utf8")) as T;
type Member = { source: string; flavour: string; bands: string[]; adults_only?: boolean };
type Preset = { id: string; label: string; copy: string; help: string; approx_gb: number; members: Member[]; settings: Record<string, unknown> };
const vocab = load<{ $comment: string; custom_note: string; presets: Preset[] }>("vocab/reference-presets.json");
const keys = load<Array<SettingDefinition & { range?: { options?: unknown[]; min?: number } }>>("settings/keys.json");
const byKey = new Map(keys.map((key) => [key.key, key]));

describe("KS-REF-00 reference presets", () => {
  test("vocabulary validates against its schema and copies pass lint", () => {
    const schema = load<Record<string, unknown>>("schemas/reference-presets.schema.json");
    const ajv = new Ajv2020({ allErrors: true });
    expect(ajv.validate(schema, vocab), JSON.stringify(ajv.errors)).toBe(true);
    expect(vocab.presets.map((preset) => preset.id).sort()).toEqual(["full", "minimum", "moderate"]);
    for (const preset of vocab.presets) {
      expect(preset.copy.length).toBeLessThanOrEqual(90);
      expect(preset.copy.trim()).toMatch(/[^.!?][.!?]$/);
    }
    expect(vocab.custom_note).toContain("not stored");
    const sourceIds = new Set(["vikidia", "wikipedia-simple", "wikipedia-en", "wiktionary-simple", "wiktionary-en", "wikivoyage", "wikibooks", "world-factbook", "medlineplus", "stackexchange"]);
    for (const preset of vocab.presets) for (const member of preset.members) expect(sourceIds.has(member.source), member.source).toBe(true);
  });

  test("preset settings name registered keys and legal values", () => {
    const modeVocab = load<{ values: Array<{ value: string }> }>("vocab/source-mode.json");
    for (const preset of vocab.presets) {
      for (const [key, value] of Object.entries(preset.settings)) {
        const entry = byKey.get(key);
        expect(entry, `${preset.id}: unknown key ${key}`).toBeDefined();
        if (key === "search.source_mode") expect(modeVocab.values.map((mode) => mode.value)).toContain(value);
        else if (entry?.range?.options) expect(entry.range.options, `${preset.id}: ${key}`).toContain(value);
        else if (entry?.range?.min !== undefined && typeof value === "number") expect(value).toBeGreaterThanOrEqual(entry.range.min as number);
      }
    }
  });

  test("Minimum is contained in Moderate, which is contained in Full", () => {
    const memberSet = (id: string) => new Set(vocab.presets.find((p) => p.id === id)!.members.map((m) => m.source));
    for (const [small, large] of [["minimum", "moderate"], ["moderate", "full"]]) {
      for (const member of memberSet(small)) expect(memberSet(large).has(member), `${member} missing from ${large}`).toBe(true);
    }
    expect(vocab.presets.find((p) => p.id === "moderate")!.members.find((m) => m.source === "wikipedia-en")!.flavour).toBe("mini");
    expect(vocab.presets.find((p) => p.id === "full")!.members.find((m) => m.source === "wikipedia-en")!.flavour).toBe("maxi");
  });

  test("adults-only entries are excluded from the child band", () => {
    for (const preset of vocab.presets) for (const member of preset.members) {
      if (member.adults_only) expect(member.bands).not.toContain("child");
      if (member.source === "medlineplus") expect(member).toMatchObject({ adults_only: true, bands: ["adult"] });
    }
  });

  test("preset copy lines pass the settings copy lint", () => {
    expect(lintSettingCopy(keys.filter((entry) => entry.key === "reference.download.when"), [])).toEqual([]);
    for (const preset of vocab.presets) {
      expect(preset.copy.length).toBeLessThanOrEqual(90);
      expect((preset.copy.match(/[.!?]/g) ?? []).length).toBe(1);
      expect(preset.copy).not.toMatch(/[—–;]/);
    }
  });
});
