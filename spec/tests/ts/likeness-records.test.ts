// LIKENESS-SIMPLIFY-01: the household likeness option and saved style subject binding.
// The if/then rule on LikenessAdapter is checked with Ajv because the generators drop
// cross-field rules silently (see record-validate.test.ts).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { LikenessAdapter } from "../../gen/ts/likeness-adapter.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(SPEC, path), "utf-8"));
const fixture = (name: string) => read(`fixtures/records/${name}`);
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const schemaOf = (name: string) => ajv.compile(read(`schemas/${name}.schema.json`));
const validateAdapter = schemaOf("likeness-adapter");
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe("likeness records", () => {
  test("style subject fixtures validate in both the schema and generated zod", () => {
    for (const name of ["likeness-adapter.household-adult.example.json", "likeness-adapter.nobody.example.json"]) {
      expect(validateAdapter(fixture(name))).toBe(true);
      expect(LikenessAdapter.safeParse(fixture(name)).success).toBe(true);
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
  const householdLikeness = keys.find((k) => k.key === "generation.household_likeness");

  test("the household likeness option defaults on and is honoured by Home", () => {
    expect(householdLikeness).toMatchObject({
      scope: "household",
      selector: "boolean",
      default: true,
      label: "Family can make pictures and videos of each other",
      help: "Anyone in the household may make pictures, videos and songs with or of any household member. An admin can turn this off.",
      level: "basic",
      secret: false,
      lives_in: "household.pictures",
      honoured_by: ["home"],
    });
    expect(keys.some((key) => key.key === "likeness.adults")).toBe(false);
    expect(keys.some((key) => key.key === "likeness.adult_content")).toBe(false);
  });
});
