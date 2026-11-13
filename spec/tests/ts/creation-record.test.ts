import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { CreationRecord } from "../../gen/ts/creation-record.js";
import { MediaSubject } from "../../gen/ts/media-subject.js";
import { MediaTemplate } from "../../gen/ts/media-template.js";
import { validateCreationRecord, validateMediaTemplate } from "../../records/ts/validate.js";
import { MediaProduction } from "../../gen/ts/media-production.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (p: string) => JSON.parse(readFileSync(join(SPEC, p), "utf8"));
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(read("schemas/generation-provenance.schema.json"));
const crtSchema = read("schemas/creation-record.schema.json");
const crt = () => read("fixtures/records/creation-record.nova.example.json");
const both = (schema: object, model: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  [ajv.validate(schema, v), model.safeParse(v).success];

describe("CREATOR-01 creation-record", () => {
  test("fixture agrees in schema and Zod; envelope fields are required", () => {
    expect(CreationRecord.parse(crt())).toMatchObject(crt());
    expect(ajv.validate(crtSchema, crt())).toBe(true);
    for (const field of ["id", "provenance", "hlc", "review", "file_ids", "kind"]) {
      const broken = crt();
      delete broken[field];
      expect(both(crtSchema, CreationRecord, broken)).toEqual([false, false]);
    }
  });

  test("words and plan never go in the generation block", () => {
    for (const extra of [{ words: { written: "x" } }, { plan: {} }, { description: "x" }, { lyrics: "x" }]) {
      const bad = crt();
      bad.generation = { ...bad.generation, ...extra };
      expect(both(crtSchema, CreationRecord, bad)).toEqual([false, false]);
    }
  });

  test("file ids, subject ids and parent ids reject paths", () => {
    const a = { ...crt(), file_ids: ["video/clip.mp4"] };
    const b = { ...crt(), sources: [{ file_id: "/tmp/a.png", role: "start" }] };
    const c = { ...crt(), parent_id: "not-a-record" };
    for (const bad of [a, b, c]) expect(both(crtSchema, CreationRecord, bad)).toEqual([false, false]);
  });

  test("review, source role and kind are closed vocabularies", () => {
    for (const bad of [{ ...crt(), review: "approved" }, { ...crt(), kind: "podcast" }, { ...crt(), sources: [{ file_id: "file-nova0003", role: "other" }] }]) {
      expect(both(crtSchema, CreationRecord, bad)).toEqual([false, false]);
    }
  });

  test("an all-ages record cannot be locked", () => {
    expect(ajv.validate(crtSchema, { ...crt(), lock: "on" })).toBe(false);
    expect(validateCreationRecord({ ...crt(), lock: "on" })).toHaveLength(1);
    expect(validateCreationRecord(crt())).toEqual([]);
    expect(ajv.validate(crtSchema, { ...crt(), audience: "adult-only", made_audience: "adult-only", lock: "on" })).toBe(true);
  });

  test("a retake points at its parent", () => {
    expect(both(crtSchema, CreationRecord, { ...crt(), id: "crt-nova0002", parent_id: "crt-nova0001", review: "rejected" })).toEqual([true, true]);
  });
});

describe("CREATOR-01 additions to existing records", () => {
  test("media-subject takes an optional person link and a locked sentence of up to 400 characters", () => {
    const schema = read("schemas/media-subject.schema.json");
    const marlow = read("fixtures/records/media-subject.marlow.example.json");
    expect(both(schema, MediaSubject, marlow)).toEqual([true, true]);
    const astro = read("fixtures/records/media-subject.astro.example.json");
    expect(both(schema, MediaSubject, astro)).toEqual([true, true]);
    expect(both(schema, MediaSubject, { ...marlow, person_id: "/people/marlow" })).toEqual([false, false]);
    expect(both(schema, MediaSubject, { ...marlow, locked_description: "x".repeat(401) })).toEqual([false, false]);
    expect(both(schema, MediaSubject, { ...marlow, locked_description: "x".repeat(400) })).toEqual([true, true]);
  });

  test("media-template fragment needs a group and an unknown group is refused", () => {
    const schema = read("schemas/media-template.schema.json");
    const fragment = read("fixtures/records/media-template.fragment.example.json");
    expect(both(schema, MediaTemplate, fragment)).toEqual([true, true]);
    const { group: _g, ...noGroup } = fragment;
    expect(ajv.validate(schema, noGroup)).toBe(false);
    expect(validateMediaTemplate(noGroup)).toHaveLength(1);
    expect(validateMediaTemplate(fragment)).toEqual([]);
    expect(both(schema, MediaTemplate, { ...fragment, group: "mood" })).toEqual([false, false]);
    const alfred = read("fixtures/records/media-template.alfred.example.json");
    expect(both(schema, MediaTemplate, alfred)).toEqual([true, true]);
  });

  test("media-production scene takes optional act and sequence labels", () => {
    const schema = read("schemas/media-production.schema.json");
    const prod = read("fixtures/records/media-production.bruno.example.json");
    const withLabels = structuredClone(prod);
    const ep = withLabels.episodes[0];
    ep.scenes[0] = { ...ep.scenes[0], act: "Act one", sequence: "The arrival" };
    expect(both(schema, MediaProduction, withLabels)).toEqual([true, true]);
    ep.scenes[0].act = "";
    expect(both(schema, MediaProduction, withLabels)).toEqual([false, false]);
  });
});
