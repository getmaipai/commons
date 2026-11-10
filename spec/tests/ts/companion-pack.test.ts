import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CompanionPack } from "../../gen/ts/companion-pack.js";
import { validateCompanionPack } from "../../companion/ts/validateCompanionPack.js";

const SPEC = join(import.meta.dir, "..", "..");
const DIR = join(SPEC, "fixtures", "companion-pack");
const schema = JSON.parse(readFileSync(join(SPEC, "schemas", "companion-pack.schema.json"), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const check = ajv.compile(schema);
const files = readdirSync(DIR).filter((name) => name.endsWith(".json")).sort();
const read = (name: string) => JSON.parse(readFileSync(join(DIR, name), "utf8"));

describe("PACK-01 CompanionPack fixtures", () => {
  for (const name of files) {
    test(`${name} agrees with JSON Schema and generated Zod`, () => {
      const value = read(name);
      const valid = name.startsWith("valid-");
      if (valid) {
        expect(check(value)).toBe(true);
        expect(CompanionPack.safeParse(value).success).toBe(true);
      } else if ([
        "invalid-track-length.json",
        "invalid-duplicate-id.json",
        "invalid-fps-mismatch.json",
        "invalid-rest-first.json",
        "invalid-rest-last.json",
      ].includes(name)) {
        expect(validateCompanionPack(value as never).length).toBeGreaterThan(0);
      } else {
        expect(check(value)).toBe(false);
        expect(CompanionPack.safeParse(value).success).toBe(false);
      }
    });
  }
});

const expected: Record<string, string> = {
  "invalid-track-length.json": "states.listen[0].track has 1 values but frames is 117; make the track length equal frames.",
  "invalid-rest-first.json": "states.listen[0].rest.first is outside [0, frames); choose a frame from 0 through 116.",
  "invalid-rest-last.json": "states.think[0].rest.last is outside [0, frames); choose a frame from 0 through 116.",
  "invalid-idle-count.json": "states.idle needs at least 2 clips; add another idle clip.",
  "invalid-webm.json": "states.listen[0].file uses WebM; use an .mp4 stacked-alpha H.264 clip.",
  "invalid-duplicate-id.json": "states.listen[0].id repeats clip id man-idle1; give every clip a unique id.",
  "invalid-fps-mismatch.json": "states.speak clips must use frame rates within 1 fps; make the clips match.",
  "invalid-wide-shape.json": "mouth.letters.wide is missing; add the wide shape index used by the atlas.",
  "invalid-emotion-files.json": "emotion.sad needs both flow and residual files; add both filenames.",
};

describe("PACK-01 plain-words validator", () => {
  test("valid demo packs have no problems", () => {
    for (const name of files.filter((entry) => entry.startsWith("valid-"))) {
      expect(validateCompanionPack(read(name))).toEqual([]);
    }
  });
  for (const [name, problem] of Object.entries(expected)) {
    test(`${name} returns its precise problem`, () => {
      expect(validateCompanionPack(read(name))).toContain(problem);
    });
  }
  test("files over the budget name the field and the repair", () => {
    const problems = validateCompanionPack(read("valid-man.json"), { "clip.mp4": 12_582_913 });
    expect(problems).toContain("budget.bytes is 12582912 but files total 12582913 bytes; raise the budget or reduce file sizes.");
    expect(problems).toContain("budget.bytes files total 12582913 bytes, over the desktop limit of 12582912; reduce file sizes.");
  });
});
