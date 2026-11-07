import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ScheduledTask } from "../../gen/ts/scheduled-task.js";
import { validateScheduledTask } from "../../records/ts/validate.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (name: string) => JSON.parse(readFileSync(join(SPEC, "fixtures", "records", `scheduled-task.${name}.example.json`), "utf-8"));
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(join(SPEC, "schemas", "scheduled-task.schema.json"), "utf-8")));

const valid = ["daily-device-action", "weekly-scene", "once-remind", "paused", "tombstoned"];
// Rejected by the schema itself.
const schemaInvalid = ["invalid-unknown-kind", "invalid-text-too-long"];
// Pass the schema shape, rejected by the cross-field validator.
const ruleInvalid = [
  "invalid-both-recurrence",
  "invalid-no-recurrence",
  "invalid-device-action-empty-targets",
  "invalid-remind-on-home-assistant",
  "invalid-external-ref-equals-id",
];

describe("SCHED-02 scheduled_task record", () => {
  test("valid fixtures validate in schema, Zod and the cross-field rules", () => {
    for (const name of valid) {
      const value = read(name);
      expect(validate(value), name).toBe(true);
      expect(ScheduledTask.parse(value)).toEqual(value);
      expect(validateScheduledTask(value), name).toEqual([]);
    }
  });

  test("schema-invalid fixtures are rejected by schema and Zod", () => {
    for (const name of schemaInvalid) {
      const value = read(name);
      expect(validate(value), name).toBe(false);
      expect(ScheduledTask.safeParse(value).success, name).toBe(false);
    }
  });

  test("rule-invalid fixtures are rejected by validateScheduledTask", () => {
    for (const name of ruleInvalid) {
      const value = read(name);
      expect(validate(value), name).toBe(true);
      expect(validateScheduledTask(value).length, name).toBeGreaterThan(0);
    }
  });

  test("a repeat needs time, days and zone together", () => {
    const { zone: _zone, ...partial } = read("daily-device-action");
    expect(validateScheduledTask(partial as never).join(" ")).toContain("all required");
  });

  test("tombstone and pause fields round-trip", () => {
    expect(read("tombstoned").deleted_at).not.toBeNull();
    expect(read("paused").paused_reason).toBe("grant_revoked");
  });
});
