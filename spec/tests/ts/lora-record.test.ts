// VIDEO-LORA-02: the Lora record, and the file record's made_audience and lock.
// The if/then rules are checked with Ajv (the generators drop them); the rest
// by validateLora and validateFileAdultLock in records/ts/validate.ts.
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { Lora } from "../../gen/ts/lora.js";
import { File } from "../../gen/ts/file.js";
import { validateLora, validateFileAdultLock, loraAllowsSuggesting } from "../../records/ts/validate.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(SPEC, path), "utf-8"));
const fixture = (name: string) => read(`fixtures/records/${name}`);
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(read("schemas/generation-provenance.schema.json"));
const schemaOf = (name: string) => ajv.compile(read(`schemas/${name}.schema.json`));
const validateSchema = schemaOf("lora");
const validateFileSchema = schemaOf("file");
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const loraFixtures = readdirSync(join(SPEC, "fixtures/records")).filter((n) => n.startsWith("lora."));

const both = (v: unknown) => validateSchema(v) && Lora.safeParse(v).success;
const mut = (f: (l: any) => void) => {
  const l = clone(fixture("lora.default-admin-only.example.json"));
  f(l);
  return l;
};

describe("Lora record", () => {
  test("there are fixtures and each validates in the schema, generated zod and validateLora", () => {
    expect(loraFixtures.length).toBe(5);
    for (const name of loraFixtures) {
      expect(both(fixture(name))).toBe(true);
      expect(validateLora(Lora.parse(fixture(name)))).toEqual([]);
    }
  });

  test("every record carries id, provenance and a clock stamp from first boot", () => {
    for (const key of ["id", "provenance", "created_at", "updated_at", "hlc"]) {
      expect(validateSchema(mut((l) => delete l[key]))).toBe(false);
    }
  });

  test("rejects unknown fields, bad ids, bad enums and a non-safetensors file", () => {
    expect(both(mut((l) => (l.extra = 1)))).toBe(false);
    expect(both(mut((l) => (l.id = "lora_7")))).toBe(false);
    expect(both(mut((l) => (l.kind = "face")))).toBe(false);
    expect(both(mut((l) => (l.base_model = "sdxl")))).toBe(false);
    expect(both(mut((l) => (l.file.format = "ckpt")))).toBe(false);
    expect(both(mut((l) => (l.file.sha256 = "ABC")))).toBe(false);
    expect(both(mut((l) => (l.file.bytes = 4294967297)))).toBe(false);
    expect(both(mut((l) => (l.description = "x".repeat(141))))).toBe(false);
    expect(both(mut((l) => (l.availability.who = "everyone")))).toBe(false);
    expect(both(mut((l) => (l.source.token_ref = "github")))).toBe(false);
  });

  test("strength is 0 to 2 and ordered min <= default <= max", () => {
    expect(both(mut((l) => (l.strength.max = 2.5)))).toBe(false);
    expect(both(mut((l) => (l.strength.min = -0.1)))).toBe(false);
    expect(validateLora(mut((l) => (l.strength.default = 1.8)))).toContainEqual(expect.stringContaining("min <= default <= max"));
    expect(validateLora(mut((l) => { l.strength = { default: 2, min: 0.5, max: 2 }; }))).toEqual([]);
  });

  test("uncertain is adult-only: all-ages needs an owner or admin's explicit choice", () => {
    const l = mut((x) => { x.audience_set_by = null; x.audience_set_at = null; });
    expect(validateSchema(l)).toBe(false);
    expect(validateLora(l)).toContainEqual(expect.stringContaining("only an owner or admin can choose all-ages"));
    expect(both(mut((x) => { x.audience = "adult-only"; x.audience_set_by = null; x.audience_set_at = null; }))).toBe(true);
  });

  test("allow_suggesting is optional, boolean, and defaults by audience", () => {
    expect(both(mut((l) => { l.allow_suggesting = true; }))).toBe(true);
    expect(both(mut((l) => { l.allow_suggesting = false; }))).toBe(true);
    expect(both(mut((l) => { l.allow_suggesting = "yes"; }))).toBe(false);
    const allAges = Lora.parse(mut((l) => { delete l.allow_suggesting; }));
    const adultOnly = Lora.parse(mut((l) => { l.audience = "adult-only"; l.allow_suggesting = undefined; }));
    expect(loraAllowsSuggesting(allAges)).toBe(true);
    expect(loraAllowsSuggesting(adultOnly)).toBe(false);
    expect(loraAllowsSuggesting(Lora.parse(mut((l) => { l.allow_suggesting = true; })))).toBe(true);
    expect(loraAllowsSuggesting(Lora.parse(mut((l) => { l.allow_suggesting = false; })))).toBe(false);
    expect(both(mut(() => {}))).toBe(true);
  });

  test("availability is admins by default, and people only when who is people", () => {
    const base = fixture("lora.default-admin-only.example.json");
    expect(base.availability).toEqual({ who: "admins", people: [] });
    expect(validateLora(mut((l) => (l.availability = { who: "adults", people: ["person-nadia0001"] }))).length).toBe(1);
    expect(validateLora(mut((l) => (l.availability = { who: "people", people: [] }))).length).toBe(1);
    expect(validateSchema(mut((l) => (l.availability = { who: "people", people: ["not-a-person"] })))).toBe(false);
    expect(validateSchema(mut((l) => (l.availability = { who: "adults", people: [] })))).toBe(true);
    expect(validateLora(mut((l) => (l.availability = { who: "people", people: [] })))).toContainEqual(expect.stringContaining("names nobody"));
    expect(validateLora(mut((l) => (l.availability = { who: "adults", people: ["person-nadia0001"] })))).toContainEqual(expect.stringContaining("must be empty"));
  });

  test("add-ins are at most 120 characters each and 400 in total", () => {
    expect(both(mut((l) => (l.positive_addins = ["x".repeat(121)])))).toBe(false);
    const four = ["a".repeat(120), "b".repeat(120), "c".repeat(120), "d".repeat(40)];
    expect(validateLora(mut((l) => (l.negative_addins = four)))).toEqual([]);
    expect(validateLora(mut((l) => (l.negative_addins = [...four, "e"])))).toContainEqual(expect.stringContaining("limit is 400"));
  });

  test("base compatibility: defaults to the base, empty while unknown", () => {
    expect(validateLora(mut((l) => (l.compatible_with = ["ltx-2.3"])))).toContain("compatible_with must include base_model");
    expect(validateLora(mut((l) => (l.compatible_with = ["ltx-2.5", "ltx-2.3"])))).toEqual([]);
    expect(validateLora(mut((l) => (l.base_model = "unknown")))).toContain("compatible_with must be empty while base_model is unknown");
  });

  test("removal and trash are set together; a placed file has no url or token", () => {
    expect(validateLora(mut((l) => (l.removed_at = "2026-11-02T17:00:00.000Z")))).toContain("removed_at and trash_until are set together, or both null");
    expect(validateLora(mut((l) => { l.removed_at = "2026-11-02T17:00:00.000Z"; l.trash_until = "2026-11-01T17:00:00.000Z"; }))).toContain("trash_until must be after removed_at");
    expect(validateLora(mut((l) => (l.source = { site: "file", url: "https://example.com/x", remote_id: null, version_id: null, token_ref: null })))).toContainEqual(expect.stringContaining("placed"));
  });

  test("a licence acknowledgment names who acknowledged", () => {
    expect(validateLora(mut((l) => (l.licence.acknowledged_at = "2026-11-02T17:00:00.000Z")))).toContainEqual(expect.stringContaining("acknowledged_by"));
  });
});

describe("Lora adult_check (VIDEO-LORA-02b, additive)", () => {
  const check = (o: object = {}) => ({ state: "unknown", basis: "source_levels", flag: false, levels_seen: 3, adult_levels: 0, checked_at: "2026-11-02T14:54:00.000Z", ...o });
  test("a record without adult_check still validates (absent reads as unknown)", () => {
    expect(both(mut(() => {}))).toBe(true);
  });
  test("all three states validate in schema and zod; other states and fields do not", () => {
    for (const state of ["normal", "unknown", "adult"]) {
      expect(both(mut((x) => { x.adult_check = check({ state, adult_levels: state === "adult" ? 1 : 0 }); }))).toBe(true);
    }
    expect(both(mut((x) => { x.adult_check = check({ state: "teen" }); }))).toBe(false);
    expect(both(mut((x) => { x.adult_check = check({ basis: "keyword" }); }))).toBe(false);
    expect(both(mut((x) => { x.adult_check = { ...check(), words: ["x"] }; }))).toBe(false);
    expect(both(mut((x) => { const c: any = check(); delete c.checked_at; x.adult_check = c; }))).toBe(false);
  });
  test("normal needs a clean read, and adult levels cannot exceed levels seen", () => {
    const bad = (o: object) => validateLora(Lora.parse(mut((x) => { x.adult_check = check(o); })));
    expect(bad({ state: "normal" })).toEqual([]);
    expect(bad({ state: "normal", flag: true }).length).toBe(1);
    expect(bad({ state: "normal", adult_levels: 1 }).length).toBe(1);
    expect(bad({ state: "normal", levels_seen: 0 }).length).toBe(1);
    expect(bad({ state: "adult", adult_levels: 4 }).length).toBe(1);
  });
  test("all-ages needs both audience_set_by and audience_set_at", () => {
    expect(both(mut((x) => { x.audience_set_at = null; }))).toBe(false);
    expect(validateLora(Lora.parse(mut((x) => { x.audience_set_at = null; }))).length).toBe(1);
  });
});

describe("Lora tested_on_25 and untested_on_25 (additive)", () => {
  test("a record without the fields still validates", () => {
    expect(both(mut(() => {}))).toBe(true);
  });
  test("tested, no_effect and null validate; other values do not", () => {
    for (const v of ["tested", "no_effect", null]) {
      expect(both(mut((x) => { x.tested_on_25 = v; }))).toBe(true);
    }
    expect(both(mut((x) => { x.tested_on_25 = "maybe"; }))).toBe(false);
    expect(both(mut((x) => { x.tested_on_25 = true; }))).toBe(false);
  });
  test("untested_on_25 is a boolean", () => {
    expect(both(mut((x) => { x.untested_on_25 = true; }))).toBe(true);
    expect(both(mut((x) => { x.untested_on_25 = false; }))).toBe(true);
    expect(both(mut((x) => { x.untested_on_25 = "yes"; }))).toBe(false);
    expect(both(mut((x) => { x.untested_on_25 = null; }))).toBe(false);
  });
});

describe("File made_audience and lock (additive)", () => {
  const file = (extra: Record<string, unknown> = {}) => ({
    id: "file-ab12cd34",
    owner_person_id: "person-sage00001",
    origin: "made",
    kind: "video",
    media_type: "video/mp4",
    size: 1024,
    sha256: "a".repeat(64),
    storage_path: "people/person-sage00001/files/file-ab12cd34.mp4",
    retention: "kept",
    provenance: {},
    created_at: "2026-11-02T18:00:00.000Z",
    hlc: "1793556000000:0:hub001",
    ...extra,
  });

  test("an old record with neither field still validates", () => {
    expect(validateFileSchema(file())).toBe(true);
    expect(File.safeParse(file()).success).toBe(true);
  });

  test("adult-only locked, adult-only cleared by the creator, all-ages unlocked all validate", () => {
    for (const extra of [
      { made_audience: "adult-only", lock: "on" },
      { made_audience: "adult-only", lock: "off" },
      { made_audience: "all-ages", lock: "off" },
      { made_audience: "adult-only" },
    ]) {
      expect(validateFileSchema(file(extra))).toBe(true);
      expect(File.safeParse(file(extra)).success).toBe(true);
      expect(validateFileAdultLock(File.parse(file(extra)) as any)).toEqual([]);
    }
  });

  test("a lock on an all-ages file, or an unknown value, is rejected", () => {
    const bad = file({ made_audience: "all-ages", lock: "on" });
    expect(validateFileSchema(bad)).toBe(false);
    expect(validateFileAdultLock(bad as any)).toHaveLength(1);
    expect(validateFileSchema(file({ lock: "maybe" }))).toBe(false);
    expect(validateFileSchema(file({ made_audience: "teen" }))).toBe(false);
  });
});
