// READER-05: ReferenceSave, one saved reference article (person scope). The schema and the generated Zod agree.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ReferenceSave } from "../../gen/ts/reference-save.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(SPEC, path), "utf-8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(read("schemas/reference-save.schema.json"));
const base = read("fixtures/records/reference-save.example.json");

describe("ReferenceSave", () => {
  test("the schema and the generated Zod accept the fixture, and Zod keeps every field", () => {
    expect(validate(base)).toBe(true);
    expect(ReferenceSave.parse(base)).toEqual(base);
  });

  test("needs its ids, person, book, path, title, clock stamp and provenance", () => {
    for (const field of ["id", "person_id", "book", "path", "title", "saved_at", "offline", "hlc", "provenance"]) {
      const broken = { ...base };
      delete broken[field];
      expect(ReferenceSave.safeParse(broken).success, `without ${field}`).toBe(false);
      expect(validate(broken), `schema without ${field}`).toBe(false);
    }
  });

  test("refuses extra fields, a foreign id prefix and empty text", () => {
    for (const bad of [{ extra: 1 }, { id: "save-a1b2c3d4" }, { id: "refsave-ab" }, { book: "" }, { path: "" }, { title: "" }, { offline: "yes" }, { saved_at: "yesterday" }]) {
      expect(ReferenceSave.safeParse({ ...base, ...bad }).success, JSON.stringify(bad)).toBe(false);
      expect(validate({ ...base, ...bad }), `schema ${JSON.stringify(bad)}`).toBe(false);
    }
  });
});
