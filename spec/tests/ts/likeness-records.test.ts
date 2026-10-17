// LIKENESS-01: the three records behind consent-based likeness (consent changes, uses, and who a style looks like)
// and the two person settings keys. The if/then rule on LikenessAdapter is checked with Ajv because the generators drop
// cross-field rules silently (see record-validate.test.ts).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { LikenessConsent } from "../../gen/ts/likeness-consent.js";
import { LikenessUse } from "../../gen/ts/likeness-use.js";
import { LikenessAdapter } from "../../gen/ts/likeness-adapter.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(SPEC, path), "utf-8"));
const fixture = (name: string) => read(`fixtures/records/${name}`);
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const schemaOf = (name: string) => ajv.compile(read(`schemas/${name}.schema.json`));
const validateConsent = schemaOf("likeness-consent");
const validateUse = schemaOf("likeness-use");
const validateAdapter = schemaOf("likeness-adapter");
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe("likeness records", () => {
  test("shipped fixtures validate in both the schema and the generated zod", () => {
    for (const name of ["likeness-consent.adults-on.example.json", "likeness-consent.adult-content-off.example.json"]) {
      expect(validateConsent(fixture(name))).toBe(true);
      expect(LikenessConsent.safeParse(fixture(name)).success).toBe(true);
    }
    expect(validateUse(fixture("likeness-use.video-from-photo.example.json"))).toBe(true);
    expect(LikenessUse.safeParse(fixture("likeness-use.video-from-photo.example.json")).success).toBe(true);
    for (const name of ["likeness-adapter.household-adult.example.json", "likeness-adapter.nobody.example.json"]) {
      expect(validateAdapter(fixture(name))).toBe(true);
      expect(LikenessAdapter.safeParse(fixture(name)).success).toBe(true);
    }
  });

  test("a consent record needs a known option, a state, its provenance and a clock stamp", () => {
    const base = fixture("likeness-consent.adults-on.example.json");
    for (const bad of [{ option: "everyone" }, { state: "maybe" }, { source: "admin" }, { hlc: "nope" }, { extra: 1 }]) {
      expect(validateConsent({ ...clone(base), ...bad })).toBe(false);
      expect(LikenessConsent.safeParse({ ...clone(base), ...bad }).success).toBe(false);
    }
    const noHlc = clone(base);
    delete noHlc.hlc;
    expect(validateConsent(noHlc)).toBe(false);
  });

  test("a use record names a medium, a way and its provenance, and carries no prompt or file", () => {
    const base = fixture("likeness-use.video-from-photo.example.json");
    for (const bad of [{ medium: "audio" }, { way: "voice" }, { source: "robot" }, { prompt: "secret" }, { file_id: "f" }]) {
      expect(validateUse({ ...clone(base), ...bad })).toBe(false);
    }
  });

  test("a style that looks like a household adult is always adult-only", () => {
    const linked = fixture("likeness-adapter.household-adult.example.json");
    expect(validateAdapter({ ...clone(linked), classification: "all-ages" })).toBe(false);
    expect(validateAdapter({ ...clone(linked), subject_person_id: null, classification: "all-ages" })).toBe(true);
    expect(validateAdapter({ ...clone(linked), state: "gone" })).toBe(false);
  });
});

describe("likeness settings keys", () => {
  const keys = read("settings/keys.json") as Array<Record<string, any>>;
  const adults = keys.find((k) => k.key === "likeness.adults")!;
  const adultContent = keys.find((k) => k.key === "likeness.adult_content")!;

  test("both are person-scope booleans that default off for every band", () => {
    for (const key of [adults, adultContent]) {
      expect(key.scope).toBe("person");
      expect(key.selector).toBe("boolean");
      expect(key.default).toBe(false);
      expect(key.band_default).toEqual({ child: false, teen: false, adult: false });
    }
  });

  test("only the person themselves changes them, never a self-service comfort key", () => {
    for (const key of [adults, adultContent]) {
      expect(key.control).toEqual({ child: "guardian", teen: "guardian", adult: "self" });
      expect(key.self_service).toBeUndefined();
      expect(key.layers).toBeUndefined();
      expect(key.secret).toBe(false);
    }
  });

  test("the base switch carries the consent wording, the second is separate", () => {
    expect(adults.label).toBe("Let other adults in this household make pictures, videos and styles that look like me");
    expect(adults.copy.consent_adult_self).toMatch(/^I agree/);
    expect(adultContent.label).toBe("Including adult content");
    expect(adults.lives_in).toBe(adultContent.lives_in);
  });
});
