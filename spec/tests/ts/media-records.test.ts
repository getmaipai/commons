import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { MediaTemplate } from "../../gen/ts/media-template.js";
import { MediaSubject } from "../../gen/ts/media-subject.js";
import { MediaProduction } from "../../gen/ts/media-production.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (p: string) => JSON.parse(readFileSync(join(SPEC, p), "utf8"));
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const entries = [
  [MediaTemplate, "media-template", "media-template.alfred.example.json"],
  [MediaSubject, "media-subject", "media-subject.astro.example.json"],
  [MediaProduction, "media-production", "media-production.bruno.example.json"],
] as const;

describe("MEDIA-01 records", () => {
  for (const [model, schemaName, fixtureName] of entries) {
    test(`${schemaName} fixture agrees in schema and Zod`, () => {
      const schema = read(`schemas/${schemaName}.schema.json`);
      const fixture = read(`fixtures/records/${fixtureName}`);
      expect(ajv.validate(schema, fixture)).toBe(true);
      expect(model.parse(fixture)).toMatchObject(fixture);
      for (const field of ["id", "provenance", "hlc"]) {
        const broken = { ...fixture };
        delete broken[field];
        expect(model.safeParse(broken).success).toBe(false);
        expect(ajv.validate(schema, broken)).toBe(false);
      }
    });
  }

  test("Library references accept file ids and reject paths", () => {
    const template = read("fixtures/records/media-template.alfred.example.json");
    const subject = read("fixtures/records/media-subject.astro.example.json");
    const production = read("fixtures/records/media-production.bruno.example.json");
    expect(MediaTemplate.safeParse({ ...template, references: ["/Library/alfred.png"] }).success).toBe(false);
    expect(MediaSubject.safeParse({ ...subject, reference_file_ids: ["pictures/astro.png"] }).success).toBe(false);
    expect(MediaProduction.safeParse({ ...production, clip_file_ids: ["video/final.mp4"] }).success).toBe(false);
    const withShow = { ...production, show: { format_id: "news_briefing", audience: "all", household_facts: false, sources: [], schedule: null, length_s: 180, state: null, stand_in_synth_id: null } };
    expect(MediaProduction.safeParse(withShow).success).toBe(true);
    const sourceSchema = read("schemas/media-source.schema.json");
    const source = { id: "msrc-show001", kind: "production", scope: "household", label: "Morning news", production_id: "mprd-bruno001", created_at: "2026-11-07T12:00:00Z", hlc: "1794052800000:0:node0001", provenance: "person-bruno" };
    expect(ajv.validate(sourceSchema, source)).toBe(true);
  });

  test("subject has a real label and deliberately no age band", () => {
    const schema = read("schemas/media-subject.schema.json");
    expect(schema.properties.real.type).toBe("boolean");
    expect(schema.properties.subject_age_band).toBeUndefined();
  });
});
