// REMOTE-STACK-SPEC-01: the engine computer's settings, status component,
// link state and error codes. Offline and deterministic: reads committed
// files only.
import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LinkState } from "../../gen/ts/link-state.js";
import { SettingsKey } from "../../gen/ts/settings-key.js";
import { StatusComponent } from "../../gen/ts/status-component.js";

const SPEC = join(import.meta.dir, "..", "..");
const readJson = (...p: string[]) => JSON.parse(readFileSync(join(SPEC, ...p), "utf8"));
const registry = readJson("settings", "keys.json") as Record<string, unknown>[];
const errors = readJson("errors", "errors.json") as { code: string; message: string; spoken_fallback: string; ui_message: string }[];
const byKey = (k: string) => registry.filter((e) => e.key === k);

const LINK_CODES = [
  "link_refused", "link_timeout", "link_dns", "link_auth_refused", "link_host_key_changed",
  "link_needs_update", "link_not_paired", "link_outside_home", "link_stack_down",
];

describe("the engine computer settings", () => {
  const keys = [
    "engines.stack.where", "engines.stack.remote.host", "engines.stack.remote.ssh_port",
    "engines.stack.remote.local_port", "engines.stack.remote.allow_tailnet",
  ];
  test("each key is declared once, household scope, in the AI group, and parses", () => {
    for (const k of keys) {
      expect(byKey(k).length, k).toBe(1);
      const e = SettingsKey.parse(byKey(k)[0]);
      expect(e.scope, k).toBe("household");
      expect(e.lives_in, k).toBe("household.ai");
    }
  });
  test("where defaults to this computer and offers exactly the two places", () => {
    const e = SettingsKey.parse(byKey("engines.stack.where")[0]);
    expect(e.default).toBe("this_computer");
    expect((e.range as { options: string[] }).options).toEqual(["this_computer", "another_computer"]);
  });
  test("ports default to 22 and 8771, the local port is admin-visible", () => {
    expect(byKey("engines.stack.remote.ssh_port")[0]!.default).toBe(22);
    expect(byKey("engines.stack.remote.local_port")[0]!.default).toBe(8771);
    expect(byKey("engines.stack.remote.local_port")[0]!.level).toBe("advanced");
  });
  test("reaching the engine computer from away is off by default, in plain words", () => {
    const e = byKey("engines.stack.remote.allow_tailnet")[0]!;
    expect(e.selector).toBe("boolean");
    expect(e.default).toBe(false);
    expect(e.label).toBe("Reach the engine computer when away from home");
    expect(String(e.help)).toContain("Only an admin can change this.");
  });
  test("the keys sit on the household AI card, which only an admin reads and writes", () => {
    const cards: { group?: string; scope?: string }[] = [];
    const walk = (n: unknown): void => {
      if (Array.isArray(n)) n.forEach(walk);
      else if (n && typeof n === "object") {
        if ((n as { group?: string }).group === "household.ai") cards.push(n as { group?: string; scope?: string });
        Object.values(n).forEach(walk);
      }
    };
    walk(readJson("settings", "areas.json"));
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) expect(c.scope).toBe("household");
  });
  test("the engine address help describes both places and stays free of addresses", () => {
    const help = String(byKey("engines.stack.url")[0]!.help);
    expect(help).toContain("another computer");
    expect(help).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
  test("none of the new copy has an em dash or a real address", () => {
    const text = JSON.stringify(registry.filter((e) => String(e.key).startsWith("engines.stack.")));
    expect(text).not.toContain("\u2014");
    expect(text).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});

describe("the engine computer status component", () => {
  test("engine_computer is a status component and an unknown name still is not", () => {
    expect(StatusComponent.safeParse("engine_computer").success).toBe(true);
    expect(StatusComponent.safeParse("engine_computr").success).toBe(false);
    expect(StatusComponent.safeParse("internet").success).toBe(true);
  });
});

describe("the link state", () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const schema = readJson("schemas", "link-state.schema.json");
  const validate = ajv.compile(schema);
  const dir = join(SPEC, "fixtures", "link-state");
  for (const f of readdirSync(dir).sort()) {
    const valid = f.startsWith("valid-");
    test(`${f} is ${valid ? "accepted" : "rejected"} by the schema and the generated model alike`, () => {
      const data = JSON.parse(readFileSync(join(dir, f), "utf8"));
      expect(validate(data)).toBe(valid);
      expect(LinkState.safeParse(data).success).toBe(valid);
    });
  }
  test("the five states are exactly connecting, ready, degraded, reconnecting, offline", () => {
    expect(schema.properties.state.enum).toEqual(["connecting", "ready", "degraded", "reconnecting", "offline"]);
    expect(schema.properties.path.enum).toEqual(["home", "tailnet"]);
  });
  test("every reason is a link error code and every link error code is a reason", () => {
    expect([...schema.properties.reason.enum].sort()).toEqual([...LINK_CODES].sort());
  });
});

describe("the link error codes", () => {
  test("all nine exist once, each with plain words in all three messages", () => {
    for (const code of LINK_CODES) {
      const matches = errors.filter((e) => e.code === code);
      expect(matches.length, code).toBe(1);
      const e = matches[0]!;
      for (const text of [e.message, e.spoken_fallback, e.ui_message]) {
        expect(text.length, code).toBeGreaterThan(0);
        expect(text, code).not.toContain("\u2014");
        expect(text, code).not.toMatch(/\d+\.\d+\.\d+\.\d+|\bSSH\b|\bDNS\b|\bTCP\b/);
      }
    }
  });
  test("codes are unique across the whole catalogue", () => {
    expect(new Set(errors.map((e) => e.code)).size).toBe(errors.length);
  });
});
