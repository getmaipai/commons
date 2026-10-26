// PERUSE-2026-10-25: the LikenessAsk record (one per-use consent ask) and the likeness.per_use switch.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { LikenessAsk } from "../../gen/ts/likeness-ask.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(SPEC, path), "utf-8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const schema = read("schemas/likeness-ask.schema.json");
const validate = ajv.compile(schema);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const names = ["likeness-ask.waiting.example.json", "likeness-ask.approved.example.json"];
const ok = (value: unknown) => validate(value) && LikenessAsk.safeParse(value).success;
const bad = (value: unknown) => !validate(value) && !LikenessAsk.safeParse(value).success;

describe("LikenessAsk", () => {
  test("shipped fixtures validate in the schema and the generated zod", () => {
    for (const name of names) expect(ok(read(`fixtures/records/${name}`))).toBe(true);
  });

  test("a bad state, medium, way, hash, source or clock stamp fails", () => {
    const base = read(`fixtures/records/${names[0]}`);
    for (const change of [{ state: "maybe" }, { medium: "song" }, { way: "photo" }, { prompt_sha256: "a".repeat(63) }, { prompt_sha256: "A".repeat(64) }, { source: "admin" }, { hlc: "nope" }, { decided_by: "stranger" }]) {
      expect(bad({ ...clone(base), ...change })).toBe(true);
    }
    const noHlc = clone(base);
    delete noHlc.hlc;
    expect(bad(noHlc)).toBe(true);
  });

  test("the record carries no prompt text", () => {
    expect(Object.keys(schema.properties)).not.toContain("prompt");
    expect(bad({ ...clone(read(`fixtures/records/${names[0]}`)), prompt: "anything" })).toBe(true);
  });
});

describe("likeness.per_use", () => {
  test("is a household switch, off by default, honoured by Home", () => {
    const key = (read("settings/keys.json") as Array<Record<string, unknown>>).find((k) => k.key === "likeness.per_use");
    expect(key).toMatchObject({ scope: "household", selector: "boolean", default: false, secret: false, honoured_by: ["home"] });
  });
});
