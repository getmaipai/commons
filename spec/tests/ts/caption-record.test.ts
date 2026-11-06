import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { Transcript, type Transcript as TranscriptType } from "../../gen/ts/transcript.js";
import { TranscriptRevision } from "../../gen/ts/transcript-revision.js";
import { CaptionTrack } from "../../gen/ts/caption-track.js";
import { validateTranscript, validateTranscriptRevision, validateCaptionTrack } from "../../records/ts/validate.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(SPEC, path), "utf-8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const schema = (name: string) => ajv.compile(read(`schemas/${name}.schema.json`));
const validators = { transcript: schema("transcript"), revision: schema("transcript-revision"), track: schema("caption-track") };
const fixtures = [
  ["transcript.two-speaker.example.json", "transcript"],
  ["transcript.empty-speakers.example.json", "transcript"],
  ["transcript-revision.edit-text.example.json", "revision"],
  ["caption-track.overridden.example.json", "track"],
] as const;
const models = { transcript: Transcript, revision: TranscriptRevision, track: CaptionTrack };
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe("CAPTION-01a records", () => {
  test("valid fixtures validate and round-trip through generated TS types", () => {
    for (const [name, kind] of fixtures) {
      const value = read(`fixtures/records/${name}`);
      expect(validators[kind](value), name).toBe(true);
      const parsed = models[kind].parse(value);
      expect(models[kind].parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
      if (kind === "transcript") expect(validateTranscript(parsed as TranscriptType)).toEqual([]);
      if (kind === "revision") expect(validateTranscriptRevision(parsed as never)).toEqual([]);
      if (kind === "track") expect(validateCaptionTrack(parsed as never)).toEqual([]);
    }
  });

  test("invalid fixtures fail with the field named", () => {
    const cases = [
      ["transcript.invalid-end-before-start.example.json", "transcript", "segments"],
      ["transcript-revision.invalid-edit-text-time.example.json", "revision", "start"],
      ["transcript.invalid-missing-clock.example.json", "transcript", "clock"],
      ["transcript.invalid-unknown-field.example.json", "transcript", "extra"],
      ["transcript.invalid-confidence.example.json", "transcript", "confidence"],
    ] as const;
    for (const [name, kind, field] of cases) {
      const value = read(`fixtures/records/${name}`);
      if (kind === "transcript" && name.includes("end-before")) expect(validateTranscript(value).join(" ")).toContain("segments[0].end");
      else if (kind === "revision") expect(validators[kind](value)).toBe(false);
      else expect(validators[kind](value)).toBe(false);
      const errors = JSON.stringify(validators[kind].errors ?? []) + (kind === "transcript" ? JSON.stringify(validateTranscript(value)) : "");
      expect(errors).toContain(field);
    }
  });

  test("op variants and nested objects reject unknown fields", () => {
    const revision = read("fixtures/records/transcript-revision.edit-text.example.json");
    const bad = clone(revision); bad.ops[0].start = 1;
    expect(validators.revision(bad)).toBe(false);
    const transcript = read("fixtures/records/transcript.two-speaker.example.json");
    transcript.segments[0].extra = true;
    expect(validators.transcript(transcript)).toBe(false);
  });
});
