import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ApiKey } from "../../gen/ts/api-key.js";
import { SettingsKey } from "../../gen/ts/settings-key.js";

const root = join(import.meta.dir, "../..");
const bytes = (path: string) => readFileSync(join(root, path));
const read = (path: string) => JSON.parse(bytes(path).toString());
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(read("schemas/api-key.schema.json"));
const fixture = read("fixtures/records/api-key.example.json");
const keys = read("settings/keys.json") as Record<string, any>[];
const key = (name: string) => keys.find(k => k.key === `coding.${name}`)!;

test("API key fixtures validate in JSON Schema and retain every field in Zod", () => {
  for (const name of ["api-key", "api-key.turn"]) {
    const value = read(`fixtures/records/${name}.example.json`);
    expect(validate(value)).toBe(true);
    expect(ApiKey.parse(value)).toEqual(value);
  }
});

test("API keys reject missing expiry, secrets, bad limits and unknown scopes", () => {
  const invalid = read("fixtures/records/api-key.invalid-no-expiry.example.json");
  for (const value of [invalid, { ...fixture, secret: "never on the wire" },
    { ...fixture, scopes: [] }, { ...fixture, scopes: ["coding:session"] },
    { ...fixture, name: "" }, { ...fixture, hint: "abc" },
    { ...fixture, limits: { requests_per_minute: 0 } },
    { ...fixture, expires_at: "later" }, { ...fixture, status: "ready" }]) {
    expect(validate(value)).toBe(false);
    expect(ApiKey.safeParse(value).success).toBe(false);
  }
});

test("Coding starts off, adults start allowed, and all copy uses the registry", () => {
  expect(key("enabled").default).toBe(false);
  expect(key("adults_by_default").default).toBe(true);
  expect(key("api.away").default).toBe(false);
  expect(key("paused").default).toBe(false);
  expect(key("api.enabled").default).toBe(true);
  for (const entry of keys.filter(k => k.key.startsWith("coding."))) {
    expect(SettingsKey.parse(entry)).toEqual(entry);
    expect(entry.copy.does.length).toBeGreaterThan(0);
    expect(entry.secret).toBe(false);
  }
});

test("all seven person keys keep their band defaults and guardian controls", () => {
  const defaults = {
    api_keys: [false, false, true], git_hosts: [false, false, true],
    network_hosts: [[], [], null], max_sessions: [1, 1, null],
    daily_tokens: [100000, 200000, null], sandbox_size: ["small", "small", "standard"],
    message_minutes: [15, 15, 30],
  };
  for (const [name, values] of Object.entries(defaults)) {
    const entry = key(`person.${name}`);
    expect(entry.layers).toEqual(["band", "person"]);
    expect(entry.band_default).toEqual(Object.fromEntries(["child", "teen", "adult"].map((b, i) => [b, values[i]])));
    expect(entry.control).toEqual({ child: "guardian", teen: "guardian", adult:
      ["api_keys", "git_hosts", "network_hosts"].includes(name) ? "self" : "guardian" });
  }
});

test("the thinking budget and admin ceiling are integer token settings and never enable minor thinking", () => {
  for (const name of ["thinking_budget", "thinking_budget_ceiling"]) {
    expect(key(name)).toMatchObject({ scope: "household", selector: "number", default: 2000,
      range: { min: 0, step: 1 }, level: "advanced", lives_in: "household.coding_limits" });
    expect(key(name).help).toMatch(/minor/i);
  }
  expect(key("thinking_budget").help).toContain("A client cannot raise it past that ceiling");
  expect(key("thinking_budget_ceiling").help).toContain("Only an admin");
});

test("gateway limits and idle unload keep the design defaults", () => {
  for (const [name, value] of Object.entries({max_streams_per_person: 2,
    requests_per_minute_per_key: 60, daily_tokens_per_person: 0, keep_warm_minutes: 15})) {
    expect(key(name)).toMatchObject({ default: value, level: "advanced" });
  }
});

test("Coding sections follow the home and account audiences", () => {
  const areas = read("settings/areas.json").areas;
  const section = (id: string) => areas.find((a: any) => a.id === id).sections.find((s: any) => s.id === "coding");
  expect(section("home")).toMatchObject({ kind: "keys", min_role: "admin", icon: "code" });
  expect(section("account")).toMatchObject({ kind: "view", min_role: "child", view: "account.coding_keys", needs: ["coding.allowed_for_me"] });
});

test("the coding data class follows the existing declaration fixture mechanism", () => {
  expect(read("fixtures/data-class/valid-coding.json")).toMatchObject({ id: "coding", sensitive: "personal", backup: "hot" });
});

test("grant-actions stays byte-identical to the phase 1 baseline", () => {
  expect(createHash("sha256").update(bytes("vocab/grant-actions.json")).digest("hex"))
    .toBe("0db88f014c59578d30f9707fb1b09a1c900be4443205e9c8e6b9e441f6cb6f61");
});
