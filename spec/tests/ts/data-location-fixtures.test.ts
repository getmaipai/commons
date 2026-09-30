// DATA-LOCATION-00a: the three shapes behind where a household's data
// lives (home docs/dev.md, "DATA-LOCATION"). Every fixture under
// spec/fixtures/<shape>/ is checked twice, by the JSON Schema (Ajv 2020,
// the same engine catalog's lint uses) and by the generated Zod model in
// spec/gen/ts/, and the two must agree with the fixture's own name
// (valid-*, invalid-*). Same round-trip shape as stack-fixtures.test.ts
// (precious-state), but against the generated models, because these
// schemas use no allOf/if/then conditional the generator would drop.
import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ZodType } from "zod";
import { DataClass } from "../../gen/ts/data-class.js";
import { DataFolder } from "../../gen/ts/data-folder.js";
import { DataLocation } from "../../gen/ts/data-location.js";

const SPEC = join(import.meta.dir, "..", "..");
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const SHAPES: Array<{ name: string; zod: ZodType }> = [
  { name: "data-class", zod: DataClass },
  { name: "data-location", zod: DataLocation },
  { name: "data-folder", zod: DataFolder },
];

function fixture(shape: string, file: string): unknown {
  return JSON.parse(readFileSync(join(SPEC, "fixtures", shape, file), "utf8"));
}

for (const shape of SHAPES) {
  describe(shape.name, () => {
    const schema = JSON.parse(readFileSync(join(SPEC, "schemas", `${shape.name}.schema.json`), "utf8")) as {
      $id: string;
      $schema: string;
    };
    const validate = ajv.compile(schema);
    const files = readdirSync(join(SPEC, "fixtures", shape.name))
      .filter((entry) => entry.endsWith(".json"))
      .sort();

    test("declares its $id under shared/spec and has valid and invalid fixtures", () => {
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(schema.$id).toBe(`https://getmaipai.github.io/shared/spec/schemas/${shape.name}.schema.json`);
      expect(files.some((entry) => entry.startsWith("valid-"))).toBe(true);
      expect(files.some((entry) => entry.startsWith("invalid-"))).toBe(true);
    });

    for (const file of files) {
      const expected = file.startsWith("valid") ? "accept" : "refuse";
      test(`${file}: the schema and the generated Zod model both ${expected}`, () => {
        const value = fixture(shape.name, file);
        const bySchema = validate(value);
        const byZod = shape.zod.safeParse(value).success;
        expect(bySchema, `JSON Schema: ${ajv.errorsText(validate.errors)}`).toBe(expected === "accept");
        expect(byZod, "generated Zod model").toBe(expected === "accept");
      });
    }
  });
}

describe("data-class promises a consumer relies on", () => {
  test("a class declaration without whenMissing is refused (a missing folder must have a rule)", () => {
    expect(DataClass.safeParse(fixture("data-class", "invalid-missing-when-missing.json")).success).toBe(false);
  });

  test("whenMissing has exactly the two behaviours the design names", () => {
    const base = fixture("data-class", "valid-models.json") as Record<string, unknown>;
    for (const value of ["hold", "degrade"]) {
      expect(DataClass.safeParse({ ...base, whenMissing: value }).success).toBe(true);
    }
    expect(DataClass.safeParse({ ...base, whenMissing: "refuse" }).success).toBe(false);
  });

  test("move is a capability (offline, online, empty); download-again is the separate refetch flag", () => {
    const base = fixture("data-class", "valid-models.json") as Record<string, unknown>;
    for (const value of ["offline", "online", "empty"]) {
      expect(DataClass.safeParse({ ...base, move: value }).success).toBe(true);
    }
    expect(DataClass.safeParse({ ...base, move: "refetch" }).success).toBe(false);
  });
});

describe("data-location promises a consumer relies on", () => {
  test("a record with only a root parses and reads back as no overrides and no move in progress", () => {
    const parsed = DataLocation.parse(fixture("data-location", "valid-root-only.json"));
    expect(parsed.classes).toEqual({});
    expect(parsed.move).toBeNull();
  });

  test("a two-class move keeps each step's previous entry so a rollback can restore it", () => {
    const parsed = DataLocation.parse(fixture("data-location", "valid-overrides-and-two-class-move.json"));
    expect(parsed.move?.steps.map((step) => step.class)).toEqual(["records", "reference"]);
    expect(parsed.move?.steps.map((step) => step.mode)).toEqual(["offline", "refetch"]);
    expect(parsed.move?.steps[0]?.previous).toEqual({ path: null, generation: 1 });
  });

  test("an override carries its generation and volume identity", () => {
    const parsed = DataLocation.parse(fixture("data-location", "valid-overrides-and-two-class-move.json"));
    expect(parsed.classes.models?.generation).toBe(2);
    expect(parsed.classes.models?.volume?.label).toBe("Big");
  });
});

describe("data-folder promises a consumer relies on", () => {
  test("a retired marker says where the data went and by which move", () => {
    const parsed = DataFolder.parse(fixture("data-folder", "valid-retired.json"));
    expect(parsed.retired?.movedTo).toBe("/Volumes/Big/MaiPai/home/people");
    expect(parsed.retired?.moveId).toBe("01J9ZK5P0X3B7D9F2H4K6M8Q1S");
  });

  test("a live marker has no retired field", () => {
    expect(DataFolder.parse(fixture("data-folder", "valid-live.json")).retired).toBeUndefined();
  });
});
