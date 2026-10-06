import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { SearxngEngines } from "../../gen/ts/searxng-engines.js";

const SPEC = join(import.meta.dir, "..", "..");
const catalog = JSON.parse(readFileSync(join(SPEC, "search", "searxng-engines.json"), "utf8"));
const fixture = JSON.parse(readFileSync(join(SPEC, "fixtures", "searxng-engines", "valid-default-groups.json"), "utf8"));

describe("SearXNG engine-group catalog", () => {
  test("the catalog matches its fixture and JSON Schema", () => {
    const schema = JSON.parse(readFileSync(join(SPEC, "schemas", "searxng-engines.schema.json"), "utf8"));
    const validate = new Ajv2020({ strict: false }).compile(schema);
    expect(validate(catalog)).toBe(true);
    expect(SearxngEngines.parse(catalog)).toEqual(fixture);
  });

  test("required groups are locked on, optional groups and privacy flagged engines default off", () => {
    const parsed = SearxngEngines.parse(catalog);
    const groups = new Map(parsed.groups.map((group) => [group.id, group]));
    expect(parsed.minimums).toEqual({ jsonFormatRequired: true, wikipediaRequired: true, webEngines: 2, childWebEngines: 1, childImageEngines: 1, pictureEngines: 1 });
    expect(groups.get("general")?.locked).toBe(true);
    expect(groups.get("reference")?.locked).toBe(true);
    expect(groups.get("images")?.default_on).toBe(true);
    expect(groups.get("news")?.default_on).toBe(true);
    expect(groups.get("video")?.default_on).toBe(true);
    expect(groups.get("science")?.default_on).toBe(false);
    expect(groups.get("extra")?.default_on).toBe(false);
    expect(groups.get("extra")?.engines.every((engine) => engine.privacy_flag)).toBe(true);
  });

  test("every engine has an operator and country and none needs an API key", () => {
    const all = SearxngEngines.parse(catalog).groups.flatMap((group) => group.engines);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((engine) => engine.name && engine.operator && engine.country)).toBe(true);
    expect(JSON.stringify(all)).not.toMatch(/api[_ -]?key|token/i);
  });
});
