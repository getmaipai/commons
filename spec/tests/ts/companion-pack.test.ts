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
const structuralInvalid = new Set(["invalid-idle-count.json", "invalid-wide-shape.json", "invalid-emotion-files.json", "invalid-webm.json"]);
const expected: Record<string, string> = {
  "invalid-track-length.json": "states.listen[0].track has 1 values but frames is 117; make the track length equal frames.",
  "invalid-duplicate-id.json": "states.listen[0].id repeats clip id man-idle1; give every clip a unique id.",
  "invalid-fps-mismatch.json": "states.speak clips must use frame rates within 1 fps; make the clips match.",
  "invalid-rest-first.json": "states.listen[0].rest.first is outside [0, frames); choose a frame from 0 through 116.",
  "invalid-rest-last.json": "states.think[0].rest.last is outside [0, frames); choose a frame from 0 through 116.",
  "invalid-duplicate-state-file.json": "states.listen[1].file repeats a file in states.listen; give each clip in a state its own file.",
};

describe("PACK-01b CompanionPack fixtures", () => {
  for (const name of files) {
    test(`${name} agrees with JSON Schema and generated Zod`, () => {
      const value = read(name);
      if (name.startsWith("valid-")) {
        expect(check(value)).toBe(true);
        expect(CompanionPack.safeParse(value).success).toBe(true);
      } else if (structuralInvalid.has(name)) {
        expect(check(value)).toBe(false);
        expect(CompanionPack.safeParse(value).success).toBe(false);
      } else {
        expect(check(value)).toBe(true);
        expect(CompanionPack.safeParse(value).success).toBe(true);
      }
    });
  }
  test("valid demo packs have no validator problems", () => {
    for (const name of files.filter((entry) => entry.startsWith("valid-"))) {
      expect(validateCompanionPack(read(name))).toEqual([]);
    }
  });
  for (const [name, problem] of Object.entries(expected)) {
    test(`${name} returns its precise problem`, () => expect(validateCompanionPack(read(name))).toContain(problem));
  }
  test("file-aware checks enforce phone twins and directory metadata", () => {
    const pack = read("valid-man.json");
    const result = validateCompanionPack(pack, { "clips/idle1.phone.mp4": 1 });
    expect(result).toContain("mouth/calm needs meta.json; include the directory metadata file.");
    expect(result).toContain("states.idle[1].phone has no matching file in files; include the phone twin.");
  });
  test("a pack without head and eyes needs no head or eyes folders", () => {
    const pack = read("valid-no-head-eyes.json");
    expect(pack.head).toBeUndefined();
    expect(pack.eyes).toBeUndefined();
    const result = validateCompanionPack(pack, { "mouth/calm/meta.json": 1, "mouth/shout/meta.json": 1, "emotion/meta.json": 1 });
    expect(result.filter((problem) => problem.includes("meta.json"))).toEqual([]);
  });
  test("a listed but broken head still fails", () => {
    const pack = read("invalid-head-missing-meta.json");
    const result = validateCompanionPack(pack, { "mouth/calm/meta.json": 1, "mouth/shout/meta.json": 1, "emotion/meta.json": 1 });
    expect(result).toContain("head needs meta.json; include the directory metadata file.");
  });
});
