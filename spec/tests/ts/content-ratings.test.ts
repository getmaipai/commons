import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ZodType } from "zod";
import { ContentRating, ContentRater, CONTENT_RATINGS_VOCAB, levelFromLabel, overCeiling, rankOf } from "../../ratings/ts/contentRating";

const SPEC = join(import.meta.dir, "..", "..");
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const SHAPES: Array<{ name: string; zod: ZodType }> = [
  { name: "content-rating", zod: ContentRating },
  { name: "content-rater", zod: ContentRater },
];

for (const shape of SHAPES) {
  describe(shape.name, () => {
    const schema = JSON.parse(readFileSync(join(SPEC, "schemas", `${shape.name}.schema.json`), "utf8")) as { $id: string; $schema: string };
    const validate = ajv.getSchema(schema.$id) ?? ajv.compile(schema);
    const fixtures = readdirSync(join(SPEC, "fixtures", shape.name)).filter((entry) => entry.endsWith(".json")).sort();

    test("declares its shared schema id and has valid and invalid fixtures", () => {
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(schema.$id).toBe(`https://getmaipai.github.io/shared/spec/schemas/${shape.name}.schema.json`);
      expect(fixtures.some((entry) => entry.startsWith("valid-"))).toBe(true);
      expect(fixtures.some((entry) => entry.startsWith("invalid-"))).toBe(true);
    });

    for (const fixture of fixtures) {
      const expected = fixture.startsWith("valid-");
      test(`${fixture}: Ajv and Zod ${expected ? "accept" : "refuse"}`, () => {
        const value = JSON.parse(readFileSync(join(SPEC, "fixtures", shape.name, fixture), "utf8")) as unknown;
        const bySchema = validate(value);
        const byZod = shape.zod.safeParse(value).success;
        expect(bySchema, `JSON Schema: ${ajv.errorsText(validate.errors)}`).toBe(expected);
        expect(byZod, "Zod mirror").toBe(expected);
      });
    }
  });
}

describe("content rating vocabulary and helpers", () => {
  test("loads seven levels in rank order", () => {
    expect(CONTENT_RATINGS_VOCAB.levels.map(({ id, rank }) => [id, rank])).toEqual([
      ["G", 0], ["PG", 1], ["PG-13", 2], ["R", 3], ["X", 4], ["Prohibited", 5], ["Unrated", null],
    ]);
  });

  for (const row of CONTENT_RATINGS_VOCAB.labels) {
    test(`maps vocab label ${row.system}/${row.value}`, () => {
      expect(levelFromLabel(row.system, row.value)).toBe(row.level);
    });
  }

  const homeLabels: Array<[string, string | number | boolean, "G" | "PG" | "PG-13" | "R" | "X"]> = [
    ["explicit", true, "R"],
    ["band", "child", "G"], ["band", "teen", "PG-13"], ["band", "adult", "X"],
    ["audience", "all-ages", "G"], ["audience", "adult-only", "X"],
    ["companion_audience", "all", "G"], ["companion_audience", "teen", "PG-13"], ["companion_audience", "adult", "X"],
    ["safe_search", "strict", "G"], ["safe_search", "moderate", "PG-13"], ["safe_search", "off", "X"],
    ["civitai_nsfw_level", 1, "PG"], ["civitai_nsfw_level", 2, "PG-13"], ["civitai_nsfw_level", 4, "R"], ["civitai_nsfw_level", 8, "X"], ["civitai_nsfw_level", 16, "X"],
    ["civitai_nsfw", true, "X"], ["huggingface_tag", "not-for-all-audiences", "X"],
    ["tv", "TV-14", "PG-13"], ["mpaa", "NC-17", "X"], ["esrb", "E10+", "PG"],
  ];
  for (const [system, value, level] of homeLabels) {
    test(`maps today's Home label ${system}/${value}`, () => expect(levelFromLabel(system, value)).toBe(level));
  }

  test("does not treat false explicit labels or unknown systems as a rating", () => {
    expect(levelFromLabel("explicit", false)).toBeNull();
    expect(levelFromLabel("explicit", "false")).toBeNull();
    expect(levelFromLabel("unknown-system", "R")).toBeNull();
  });
  test("trims and folds outside label values but keeps systems exact", () => {
    expect(levelFromLabel("tv", " tv-14 ")).toBe("PG-13");
    expect(levelFromLabel("TV", "TV-14")).toBeNull();
  });

  for (const level of ["G", "PG", "PG-13", "R", "X", "Prohibited", "Unrated"] as const) {
    test(`ceiling 0 behavior for ${level}`, () => expect(overCeiling(level, 0)).toBe(level !== "G"));
    test(`ceiling 4 behavior for ${level}`, () => expect(overCeiling(level, 4)).toBe(level === "Prohibited"));
  }
  test("Unrated has no rank and Prohibited has rank five", () => {
    expect(rankOf("Unrated")).toBeNull();
    expect(rankOf("Prohibited")).toBe(5);
  });
});
