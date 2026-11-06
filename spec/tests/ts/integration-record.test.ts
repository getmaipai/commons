import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { Integration } from "../../gen/ts/integration.js";
import { splitGrantTarget, validateIntegrations } from "../../records/ts/validate.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (name: string) => JSON.parse(readFileSync(join(SPEC, "fixtures", "records", name), "utf-8"));
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(join(SPEC, "schemas", "integration.schema.json"), "utf-8")));

const valid = [
  "integration.default-home-assistant.example.json",
  "integration.second-uptime-kuma.example.json",
  "integration.tombstoned.example.json",
];
const invalid = [
  "integration.invalid-slug-slash.example.json",
  "integration.invalid-slug-colon.example.json",
  "integration.invalid-unknown-type.example.json",
  "integration.invalid-secret-field.example.json",
];

describe("SPEC-INSTANCES-01 integration record", () => {
  test("valid fixtures validate in schema and Zod", () => {
    for (const name of valid) {
      const value = read(name);
      expect(validate(value), name).toBe(true);
      expect(Integration.parse(value)).toEqual(value);
    }
  });

  test("each invalid fixture is rejected by schema and Zod", () => {
    for (const name of invalid) {
      const value = read(name);
      expect(validate(value), name).toBe(false);
      expect(Integration.safeParse(value).success, name).toBe(false);
    }
  });

  test("(type, instance) must be unique, tombstones included", () => {
    const [a, b, c] = valid.map(read);
    expect(validateIntegrations([a, b, c])).toEqual([]);
    expect(validateIntegrations([c, { ...c, id: "integ-giteanew" }]).join(" ")).toContain("gitea/old-forge");
    expect(validateIntegrations([a, { ...a, type: "plex", id: "integ-plexdefault" }])).toEqual([]);
  });

  test("grant targets split at the first slash; unprefixed means default", () => {
    expect(splitGrantTarget("cabin/area:kitchen")).toEqual({ instance: "cabin", native: "area:kitchen" });
    expect(splitGrantTarget("main/owner/repo")).toEqual({ instance: "main", native: "owner/repo" });
    expect(splitGrantTarget("area:kitchen")).toEqual({ instance: "default", native: "area:kitchen" });
  });
});
