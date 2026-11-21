// CODE-SPEC-01 and CODE-TIER-01: the coding-session, coding-environment, coding-event and
// git-connection records, each with a fixture that validates and one that fails, in JSON
// Schema and in the generated Zod model. No model name appears in any of them.
import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CodingSession } from "../../gen/ts/coding-session.js";
import { CodingEnvironment } from "../../gen/ts/coding-environment.js";
import { CodingEvent } from "../../gen/ts/coding-event.js";
import { GitConnection } from "../../gen/ts/git-connection.js";

const root = join(import.meta.dir, "../..");
const read = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);

const cases = [
  ["coding-session", CodingSession, ["coding-session", "coding-session.minimal"], ["coding-session.invalid-tier.invalid"]],
  ["coding-environment", CodingEnvironment, ["coding-environment", "coding-environment.household"], ["coding-environment.invalid-secret.invalid"]],
  ["coding-event", CodingEvent, ["coding-event", "coding-event.secret-found"], ["coding-event.invalid-kind.invalid"]],
  ["git-connection", GitConnection, ["git-connection"], ["git-connection.invalid-token.invalid"]],
] as const;

describe("coding records", () => {
  for (const [name, model, good, bad] of cases) {
    const validate = ajv.compile(read(`schemas/${name}.schema.json`));
    test(`${name}: valid fixtures pass JSON Schema and Zod, invalid ones fail both`, () => {
      for (const f of good) {
        const v = read(`fixtures/records/${f}.example.json`);
        expect(validate(v), f).toBe(true);
        expect(model.safeParse(v).success, f).toBe(true);
      }
      for (const f of bad) {
        const v = read(`fixtures/records/${f}.example.json`);
        expect(validate(v), f).toBe(false);
        expect(model.safeParse(v).success, f).toBe(false);
      }
    });
  }
  test("a session's tier is standard, boost or max, optional, and never reduced", () => {
    const schema = read("schemas/coding-session.schema.json");
    expect(schema.properties.tier.enum).toEqual(["standard", "boost", "max"]);
    expect(schema.properties.tier.default).toBe("standard");
    expect(schema.required).not.toContain("tier");
    expect(schema.properties.model_id.description).toContain("Provenance");
  });
  test("no new coding file names a model", () => {
    const files = ["schemas/coding-session", "schemas/coding-environment", "schemas/coding-event", "schemas/git-connection"].map((f) => `${f}.schema.json`)
      .concat(cases.flatMap(([, , g, b]) => [...g, ...b].map((f) => `fixtures/records/${f}.example.json`)));
    for (const f of files) expect(readFileSync(join(root, f), "utf8"), f).not.toMatch(/qwen|llama|gpt|claude|gemma|mistral|deepseek|splash/i);
  });
  test("the three coding notification types have their Telegram keys", () => {
    const keys = read("settings/keys.json") as Array<{ key: string }>;
    for (const n of ["session_done", "needs_you", "workspace_expiring"]) expect(keys.some((k) => k.key === `notifications.coding.${n}.telegram`)).toBe(true);
  });
});
