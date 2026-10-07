// LOG-PRIV-01a: the typed log-event registry and the problem_report record.
// Owner principle: no log ever carries specifics that reveal what another
// user did, so the field types are a closed list and free text cannot be
// declared. Checks run through Ajv (the JSON Schema itself, if/then
// conditions included) and through the generated Zod model.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { LogEvents } from "../../gen/ts/log-events.js";
import { ProblemReport } from "../../gen/ts/problem-report.js";

const SPEC = join(import.meta.dir, "..", "..");
const readJson = (...parts: string[]) => JSON.parse(readFileSync(join(SPEC, ...parts), "utf8"));
const registry = readJson("log", "events.json");
const registrySchema = readJson("schemas", "log-events.schema.json");
const reportSchema = readJson("schemas", "problem-report.schema.json");
const errorCodes = new Set<string>(readJson("errors", "errors.json").map((e: { code: string }) => e.code));

function ajv() {
  const instance = new Ajv2020({ strict: false, allErrors: true });
  addFormats(instance);
  return instance;
}
const validateRegistry = ajv().compile(registrySchema);
const validateReport = ajv().compile(reportSchema);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const withField = (field: unknown) => {
  const next = clone(registry);
  next.events[0].fields.push(field);
  return next;
};

describe("log/events.json", () => {
  test("validates against its JSON Schema and its generated model", () => {
    expect(validateRegistry(registry)).toBe(true);
    expect(() => LogEvents.parse(registry)).not.toThrow();
  });

  test("seeds exactly the starter events with the declared fields", () => {
    const shape = Object.fromEntries(
      registry.events.map((e: { name: string; fields: { name: string; type: string }[] }) => [
        e.name,
        e.fields.map((f) => `${f.name}:${f.type}`),
      ]),
    );
    expect(shape).toEqual({
      hub_start: [],
      hub_stop: [],
      engine_ready: [],
      engine_error: ["code:code"],
      turn_failed: ["code:code", "stage:enum", "trace:trace"],
      tool_failed: ["tool:enum", "code:code", "trace:trace"],
      safety_flag: ["category:enum", "mode:enum"],
      search_degraded: ["code:code"],
      backup_done: ["duration:duration"],
      backup_failed: ["code:code"],
      update_available: ["version:version"],
      log_rotated: ["files:integer"],
    });
  });

  test("event names are unique and so are field names within an event", () => {
    const names = registry.events.map((e: { name: string }) => e.name);
    expect(new Set(names).size).toBe(names.length);
    for (const event of registry.events) {
      const fieldNames = event.fields.map((f: { name: string }) => f.name);
      expect(new Set(fieldNames).size).toBe(fieldNames.length);
    }
  });

  test("the closed list of field types is exactly the seven allowed ones minus none", () => {
    const types = new Set(registry.events.flatMap((e: { fields: { type: string }[] }) => e.fields.map((f) => f.type)));
    const allowed = ["enum", "integer", "duration", "code", "version", "trace"];
    for (const type of types) expect(allowed).toContain(type);
  });

  test("the safety mode enum is the admin-set modes only", () => {
    const safety = registry.events.find((e: { name: string }) => e.name === "safety_flag");
    const mode = safety.fields.find((f: { name: string }) => f.name === "mode");
    expect(mode.values).toEqual(["child", "teen", "adult"]);
  });

  test("trace policy is six characters and expiring", () => {
    expect(registry.trace_policy).toEqual({ length: 6, expires: true });
  });

  test("a string-typed non-enum field is rejected", () => {
    for (const type of ["string", "text", "url", "filename", "free_text", "uuid"]) {
      const bad = withField({ name: "detail", type });
      expect(validateRegistry(bad)).toBe(false);
      expect(() => LogEvents.parse(bad)).toThrow();
    }
  });

  test("an enum field with no declared values is rejected", () => {
    const bad = withField({ name: "kind", type: "enum" });
    expect(validateRegistry(bad)).toBe(false);
    expect(() => LogEvents.parse(bad)).toThrow();
  });

  test("an extra key such as a free-text default or max length is rejected", () => {
    for (const extra of [{ default: "x" }, { maxLength: 40 }, { pattern: ".*" }, { example: "x" }]) {
      const bad = withField({ name: "detail", type: "code", ...extra });
      expect(validateRegistry(bad)).toBe(false);
      expect(() => LogEvents.parse(bad)).toThrow();
    }
  });

  test("the field names of things a log must never carry are refused", () => {
    for (const name of ["title", "url", "filename", "path", "argument", "args", "prompt", "reply", "query", "text", "message", "person_id", "conversation_id", "record_id"]) {
      const bad = withField({ name, type: "code" });
      expect(validateRegistry(bad)).toBe(false);
      expect(() => LogEvents.parse(bad)).toThrow();
    }
  });

  test("an unknown component is rejected", () => {
    const bad = clone(registry);
    bad.events[0].component = "household";
    expect(validateRegistry(bad)).toBe(false);
  });
});

const base = () => ({
  id: "pr-abc123",
  provenance: { component: "turn", trace: "a1b2c3" },
  created_at: "2026-10-07T10:00:00Z",
  hlc: "1790000000000:0:node01",
  code: "timeout",
  reporter_mode: "adult",
  parts: [
    { kind: "code", consented: true, code: "timeout" },
    { kind: "timing", consented: true, duration_ms: 1200 },
    { kind: "description", consented: true, content: "It stopped partway." },
  ],
});

describe("problem_report", () => {
  test("a valid adult report passes the schema and the generated model", () => {
    expect(validateReport(base())).toBe(true);
    expect(() => ProblemReport.parse(base())).not.toThrow();
  });

  test("the code on a report and on a code part are error codes from errors.json", () => {
    expect(errorCodes.has(base().code)).toBe(true);
    expect(errorCodes.has(base().parts[0]!.code!)).toBe(true);
  });

  test("a child or teen report may carry codes and timings", () => {
    for (const reporter_mode of ["child", "teen"]) {
      const report = { ...base(), reporter_mode, parts: base().parts.slice(0, 2) };
      expect(validateReport(report)).toBe(true);
    }
  });

  test("a child or teen report with a description or excerpt part is rejected", () => {
    for (const reporter_mode of ["child", "teen"]) {
      for (const kind of ["description", "excerpt"]) {
        const consented = { ...base(), reporter_mode, parts: [{ kind, consented: true, content: "text" }] };
        expect(validateReport(consented)).toBe(false);
        const unconsented = { ...base(), reporter_mode, parts: [{ kind, consented: false }] };
        expect(validateReport(unconsented)).toBe(false);
      }
    }
  });

  test("a child or teen report with content on any part is rejected", () => {
    for (const reporter_mode of ["child", "teen"]) {
      const report = { ...base(), reporter_mode, parts: [{ kind: "code", consented: true, code: "timeout", content: "x" }] };
      expect(validateReport(report)).toBe(false);
    }
  });

  test("content needs consent: consented false with content is rejected", () => {
    const report = { ...base(), parts: [{ kind: "description", consented: false, content: "x" }] };
    expect(validateReport(report)).toBe(false);
  });

  test("an adult description part with consent must carry content", () => {
    const report = { ...base(), parts: [{ kind: "description", consented: true }] };
    expect(validateReport(report)).toBe(false);
  });

  test("an adult description part without consent and without content is valid", () => {
    const report = { ...base(), parts: [{ kind: "description", consented: false }] };
    expect(validateReport(report)).toBe(true);
  });

  test("a code part needs code and a timing part needs duration_ms", () => {
    expect(validateReport({ ...base(), parts: [{ kind: "code", consented: true }] })).toBe(false);
    expect(validateReport({ ...base(), parts: [{ kind: "timing", consented: true }] })).toBe(false);
    expect(validateReport({ ...base(), parts: [{ kind: "timing", consented: true, duration_ms: 5, code: "timeout" }] })).toBe(false);
  });

  test("an unknown reporter_mode is rejected", () => {
    for (const reporter_mode of ["adult_mode", "guest", "owner"]) {
      expect(validateReport({ ...base(), reporter_mode })).toBe(false);
    }
  });

  test("provenance and parts reject extra keys such as ids", () => {
    const withPerson = { ...base(), provenance: { component: "turn", trace: null, person_id: "person-abc123" } };
    expect(validateReport(withPerson)).toBe(false);
    const withConv = { ...base(), conversation_id: "conv-abc123" };
    expect(validateReport(withConv)).toBe(false);
    const partExtra = { ...base(), parts: [{ kind: "code", consented: true, code: "timeout", turn_id: "turn-abc123" }] };
    expect(validateReport(partExtra)).toBe(false);
  });

  test("the trace must be six lowercase characters or null", () => {
    expect(validateReport({ ...base(), provenance: { component: "turn", trace: null } })).toBe(true);
    expect(validateReport({ ...base(), provenance: { component: "turn", trace: "abc" } })).toBe(false);
    expect(validateReport({ ...base(), provenance: { component: "turn", trace: "ABCDEF" } })).toBe(false);
  });
});
