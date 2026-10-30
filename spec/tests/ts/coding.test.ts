import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ApiKey } from "../../gen/ts/api-key.js";
import { SettingsKey } from "../../gen/ts/settings-key.js";
import { CodingModeReadiness } from "../../gen/ts/coding-mode-readiness.js";
import { lintSettingCopy } from "../../interpreters/ts/describeSetting.js";

const root = join(import.meta.dir, "../..");
const bytes = (path: string) => readFileSync(join(root, path));
const read = (path: string) => JSON.parse(bytes(path).toString());
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(read("schemas/api-key.schema.json"));
const fixture = read("fixtures/records/api-key.example.json");
const readiness = read("fixtures/records/coding-mode-readiness.example.json") as any;
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

test("Home coding engine controls have their defaults, ranges and copy", () => {
  expect(key("yield_to_chat")).toMatchObject({ scope: "household", selector: "boolean", default: true,
    level: "advanced", lives_in: "household.coding_limits", honoured_by: ["home"],
    copy: { does: "Coding waits while chat is answering" } });
  expect(key("engine")).toMatchObject({ scope: "household", selector: "select", default: "auto",
    range: { options: ["auto", "splash", "llama-server"] }, level: "advanced",
    lives_in: "household.coding", honoured_by: ["home"] });
  expect(key("splash_cache_gb")).toMatchObject({ scope: "household", selector: "number", default: 8,
    range: { min: 1, max: 64, step: 1 }, level: "advanced", lives_in: "household.coding",
    honoured_by: ["home"] });
  for (const name of ["engine", "splash_cache_gb"]) expect(key(name).copy.does.length).toBeGreaterThan(0);
  expect(SettingsKey.parse(read("fixtures/records/settings-key.coding-engine.example.json")))
    .toEqual(read("fixtures/records/settings-key.coding-engine.example.json"));
  expect(SettingsKey.safeParse(read("fixtures/records/settings-key.coding-engine.invalid.json")).success).toBe(false);
});

test("Coding sections follow the home and account audiences", () => {
  const areas = read("settings/areas.json").areas;
  const home = areas.find((a: any) => a.id === "settings").sections.find((s: any) => s.id === "ai");
  const account = areas.find((a: any) => a.id === "settings").sections.find((s: any) => s.id === "chat");
  expect(home.tabs.find((t: any) => t.id === "coding")).toMatchObject({ min_role: "admin" });
  expect(account.tabs.find((t: any) => t.id === "coding")).toMatchObject({ min_role: "child", view: "account.coding_keys", needs: ["coding.allowed_for_me"] });
});

test("Home mode parses, matches its options, passes copy lint, and appears in the Coding card", () => {
  const homeMode = keys.find(k => k.key === "coding.home_mode")!;
  expect(SettingsKey.parse(homeMode)).toEqual(homeMode);
  expect(homeMode).toMatchObject({ scope: "household", selector: "select", default: "normal",
    range: { options: ["normal", "coding"] }, lives_in: "household.coding", level: "basic",
    secret: false, honoured_by: ["home"] });
  expect(homeMode.range.options).toContain(homeMode.default);
  const baseline = read("settings/copy-lint-baseline.json");
  expect(lintSettingCopy(keys, baseline)).toEqual([]);
  const codingCard = read("settings/areas.json").areas.find((a: any) => a.id === "settings")
    .sections.find((s: any) => s.id === "ai").cards;
  expect(codingCard).toContainEqual({ label: "Coding", group: homeMode.lives_in, scope: "household", tab: "coding" });
  expect(SettingsKey.parse(read("fixtures/records/settings-key.coding-home-mode.example.json")))
    .toEqual(read("fixtures/records/settings-key.coding-home-mode.example.json"));
});

test("coding mode readiness validates the fixture and keeps its eight items in order", () => {
  const schemaValidate = ajv.compile(read("schemas/coding-mode-readiness.schema.json"));
  const ids = ["coding_enabled", "engine", "pieces", "hardware", "memory", "self_test", "client", "bench"];
  expect(schemaValidate(readiness)).toBe(true);
  expect(CodingModeReadiness.parse(readiness)).toEqual(readiness);
  expect(readiness.items.map((item: any) => item.id)).toEqual(ids);
  const isConsistent = (value: typeof readiness) =>
    value.ready === value.items.every((item: any) => item.state === "done") &&
    value.first_unmet === (value.items.find((item: any) => item.state !== "done")?.id ?? null);
  expect(isConsistent(readiness)).toBe(true);
  const falselyReady = { ...readiness, ready: true };
  expect(schemaValidate(falselyReady)).toBe(true);
  expect(isConsistent(falselyReady)).toBe(false);
  const reasons = read("vocab/coding-mode-readiness-reasons.json");
  expect(Object.keys(reasons)).toEqual(ids);
  for (const reason of Object.values(reasons) as string[]) expect(reason).not.toMatch(/[—–]/);
});

test("the coding data class follows the existing declaration fixture mechanism", () => {
  expect(read("fixtures/data-class/valid-coding.json")).toMatchObject({ id: "coding", sensitive: "personal", backup: "hot" });
});

test("grant-actions stays byte-identical to the phase 1 baseline", () => {
  expect(createHash("sha256").update(bytes("vocab/grant-actions.json")).digest("hex"))
    .toBe("f7093c44c49c092b1e6f49d524d7096695a6ea0d13ea285b86fee4c49e9f5f3d");
});
