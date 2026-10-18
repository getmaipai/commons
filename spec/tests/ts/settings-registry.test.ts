// Round-trip the real registry through SettingsKey. A hand-edit that
// breaks an entry's shape would otherwise surface downstream in a
// consumer at boot.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SettingsKey } from "../../gen/ts/settings-key.js";
import { SettingValue } from "../../gen/ts/setting-value.js";
import { SettingsDelta } from "../../gen/ts/settings-delta.js";

const REGISTRY_PATH = join(import.meta.dir, "..", "..", "settings", "keys.json");

function loadRegistry(): unknown[] {
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

describe("spec/settings/keys.json", () => {
  test("every entry parses as a SettingsKey", () => {
    const entries = loadRegistry();
    for (const entry of entries) {
      const key = (entry as { key?: unknown }).key;
      expect(() => SettingsKey.parse(entry), `entry "${String(key)}" failed SettingsKey.parse`).not.toThrow();
    }
  });

  test("every key is declared exactly once (one definition, one place)", () => {
    const entries = loadRegistry() as { key: string }[];
    const keys = entries.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // Hubs compare their own declaration with this file entry by entry (Home's settings drift check). A key that
  // leaves `secret` out reads the same but is a different entry, so it fails there (spec-v0.1.177,
  // generation.music.length). Every entry says it outright.
  test("every entry declares secret as true or false", () => {
    const entries = loadRegistry() as Record<string, unknown>[];
    const missing = entries.filter((e) => typeof e.secret !== "boolean").map((e) => e.key);
    expect(missing).toEqual([]);
  });

  test("the retired turn pipeline toggle is absent", () => {
    const entries = loadRegistry() as Record<string, unknown>[];
    expect(entries.some((e) => e.key === "turn.pipeline.next")).toBe(false);
  });

  test("vision and voice model selectors include the fixed off choice beside their live model source", () => {
    const entries = loadRegistry() as Record<string, unknown>[];
    const copy = {
      "engines.vision.choice": "Off: Home will not use photo understanding.",
      "engines.stt.choice": "Off: Home will not listen to speech.",
      "engines.tts.choice": "Off: Home will not speak replies aloud.",
    };
    for (const [key, description] of Object.entries(copy)) {
      const entry = entries.find((row) => row.key === key);
      expect(entry, key).toBeDefined();
      expect(SettingsKey.parse(entry), key).toMatchObject({
        selector: "select",
        range: { options: ["off"], options_from: `models.${key.split(".")[1]}` },
        copy: { options: { off: description } },
      });
    }
  });

  test("the emergency kit acknowledgement stores only a household timestamp", () => {
    const matches = (loadRegistry() as Record<string, unknown>[]).filter((row) => row.key === "backups.emergency_kit_saved_at");
    expect(matches).toHaveLength(1);
    const entry = SettingsKey.parse(matches[0]);
    expect(entry).toMatchObject({
      scope: "household",
      selector: "text",
      default: null,
      label: "Backup key saved",
      lives_in: "household.storage",
      honoured_by: ["home"],
      secret: false,
    });
    expect(entry.self_service).toBeUndefined();
    expect(entry.layers).toBeUndefined();
  });

  test("the setup checklist dismissal is a person list, not shared with pinned apps", () => {
    const matches = (loadRegistry() as Record<string, unknown>[]).filter((row) => row.key === "setup.checklist_dismissed");
    expect(matches).toHaveLength(1);
    const entry = SettingsKey.parse(matches[0]);
    expect(entry).toMatchObject({
      scope: "person",
      selector: "text",
      default: "[]",
      label: "Setup checklist items hidden",
      lives_in: "profile.appearance",
      honoured_by: ["home"],
      secret: false,
    });
    expect(entry.self_service).toBeUndefined();
  });

  test("guided tours use the automatic-start switch in Account Appearance", () => {
    const entry = (loadRegistry() as Record<string, unknown>[]).find((row) => row.key === "tours.autostart.enabled");
    expect(entry).toMatchObject({ scope: "person", selector: "boolean", default: true, label: "Start tours automatically", lives_in: "profile.appearance" });
  });

  test("AI companions default on and are guardian-controlled for every age band", () => {
    const entries = loadRegistry() as Record<string, unknown>[];
    const matches = entries.filter((row) => row.key === "companions.allowed");
    expect(matches).toHaveLength(1);
    const entry = SettingsKey.parse(matches[0]);
    expect(entry).toMatchObject({
      scope: "person",
      selector: "boolean",
      layers: ["household", "person"],
      merge: "override",
      default: true,
      band_default: { child: true, teen: true, adult: true },
      label: "AI companions",
      copy: { does: "Controls who can see and use the available companions." },
      control: { child: "guardian", teen: "guardian", adult: "guardian" },
      level: "basic",
      secret: false,
      lives_in: "person.companions",
      honoured_by: ["home"],
    });
    expect(entry.help).toBe("AI companions are on for everyone unless an admin turns them off for the household or for one person. Turning this off hides companions and keeps their data.");
    expect(entry.self_service).toBeUndefined();
  });

  test("household.home replaces the old household location key", () => {
    const entries = loadRegistry() as Record<string, unknown>[];
    const keys = new Map(entries.map((entry) => [entry.key as string, SettingsKey.parse(entry)]));
    expect(keys.has("household.home_place")).toBe(false);
    const home = keys.get("household.home");
    expect(home?.scope).toBe("household");
    expect(home?.selector).toBe("location");
    expect(home?.range).toEqual({ multiple: false, allow_current: false });
    expect(home?.default).toBeNull();
    expect(home?.lives_in).toBe("household.system");
    expect(home?.honoured_by).toEqual(["home", "bot"]);
  });

  test("KS-00 declares the eight knowledge search settings exactly once", () => {
    const entries = loadRegistry() as { key: string; default: unknown; range?: Record<string, unknown> }[];
    const byKey = new Map(entries.map((entry) => [entry.key, entry]));
    const keys = [
      "news.shelf.enabled", "news.poll_interval_s", "news.retention_days",
      "reference.update.max_mbps",
      "search.fetch_cache_gb", "search.wayback_fallback",
    ];
    for (const key of keys) expect(entries.filter((entry) => entry.key === key), key).toHaveLength(1);
    expect(byKey.get("news.poll_interval_s")?.default).toBe(1800);
    expect(byKey.get("news.poll_interval_s")?.range?.min).toBe(900);
    expect(byKey.get("news.retention_days")?.default).toBe(90);
    expect(byKey.get("reference.update.max_mbps")?.default).toBe(20);
    expect(byKey.get("search.fetch_cache_gb")?.default).toBe(2);
    expect(byKey.get("search.wayback_fallback")?.default).toBe(true);
  });

  test("a new registry keeps every key declared by its parent spec tag", () => {
    // This assertion is updated when a deliberate retirement is made. It
    // prevents regenerating from a lagging Home declaration set from silently
    // deleting a spec-owned key, as happened in spec-v0.1.106.
    const entries = loadRegistry() as { key: string }[];
    const current = new Set(entries.map((entry) => entry.key));
    const parentSpecKeys = [
      "engines.stack.where",
      "engines.stack.remote.host",
      "engines.stack.remote.ssh_port",
      "engines.stack.remote.local_port",
      "engines.stack.remote.allow_tailnet",
    ];
    for (const key of parentSpecKeys) expect(current.has(key), key).toBe(true);
  });
});


describe("SETTINGS-ROBOT-01 declarations", () => {
  test("all approved robot controls are declared once and the tailnet opt-in defaults off", () => {
    const entries = loadRegistry() as { key: string; default: unknown }[];
    const keys = new Map(entries.map((entry) => [entry.key, entry]));
    const required = [
      "household.quiet_hours.from", "household.quiet_hours.to",
      "person.quiet_hours.from", "person.quiet_hours.to",
      "robot.initiative.enabled", "robot.initiative.tiers_spoken",
      "robot.initiative.max_offers_per_hour", "robot.initiative.accept_phrases",
      "person.robot.may_address", "person.robot.topics", "person.robot.greet_by_name",
      "person.robot.follow_up", "person.robot.playful_clips", "person.vision.watch",
      "person.vision.gestures", "vision.on_request.enabled", "robot.greetings.mode",
      "safety.alarm.sensors", "safety.alarm.voice", "safety.alarm.volume",
      "safety.alarm.child_line", "safety.alarm.repeat_seconds",
      "robot.live_view.enabled", "robot.live_view.who", "robot.offlan.tailnet",
      "robot.camera.watch_level", "robot.follow_up.seconds", "robot.idle.level",
      "robot.barge_in.open_mic", "robot.gestures.enabled", "robot.initiative.allowed_here",
      "robot.sleep.auto",
    ];
    for (const key of required) expect(keys.has(key), key).toBe(true);
    expect(keys.get("robot.offlan.tailnet")?.default).toBe(false);
    expect(keys.get("robot.gestures.enabled")?.default).toBe(false);
    expect(keys.get("robot.sleep.auto")).toMatchObject({ scope: "device", selector: "boolean", default: true, honoured_by: ["home", "bot"] });
    for (const key of ["household.quiet_hours.from", "household.quiet_hours.to"]) expect(keys.get(key)?.honoured_by).toEqual(["home", "bot"]);
    expect(keys.get("robot.initiative.allowed_here")?.default).toBe(false);
    expect(keys.get("person.vision.watch")?.default).toBe("presence");
    expect(keys.get("notifications.time_sensitive.robot")?.default).toBe(false);
    expect(keys.has("person.robot.may_address")).toBe(true);
    expect(keys.has("person.robot.greet_by_name")).toBe(true);
  });
});

describe("robot.live_view.who is a multi-select of people", () => {
  test("declares range.multiple with a list default, and parses as a SettingsKey", () => {
    const entries = loadRegistry() as { key: string; selector: string; default: unknown; range?: { multiple?: boolean } }[];
    const who = entries.filter((e) => e.key === "robot.live_view.who");
    expect(who).toHaveLength(1);
    expect(who[0]!.selector).toBe("person");
    expect(who[0]!.range?.multiple).toBe(true);
    expect(who[0]!.default).toEqual([]);
    expect(() => SettingsKey.parse(who[0])).not.toThrow();
  });

  test("every person key with range.multiple has a list default", () => {
    const entries = loadRegistry() as { key: string; selector: string; default: unknown; range?: { multiple?: boolean } }[];
    for (const e of entries.filter((x) => x.selector === "person" && x.range?.multiple === true)) {
      expect(Array.isArray(e.default), e.key).toBe(true);
    }
  });
});

describe("IMG-SPEC-KEYS declarations", () => {
  const entries = loadRegistry() as Record<string, unknown>[];
  const help =
    "Adults and teens are on by default; children are off until a parent enables this. Teens control their own setting.";
  for (const [key, label] of [
    ["reference.images", "Show pictures in answers"],
    ["chat.photo_uploads", "Send photos in chat"],
  ] as const) {
    test(`${key} is declared once, person scoped, boolean, default on, honoured by home`, () => {
      const matches = entries.filter((e) => e.key === key);
      expect(matches.length).toBe(1);
      const entry = SettingsKey.parse(matches[0]);
      expect(entry.scope).toBe("person");
      expect(entry.selector).toBe("boolean");
      expect(entry.default).toBe(true);
      expect(entry.label).toBe(label);
      expect(entry.help).toBe(help);
      expect(entry.level).toBe("basic");
      expect(entry.secret).toBe(false);
      expect(entry.honoured_by).toEqual(["home"]);
    });
  }
});

describe("SETTINGS-LAYERS-01 declarations", () => {
  type Entry = { key: string; layers?: string[]; merge?: string; user_defaults_keys?: Record<string, string>; scope: string; selector: string; range?: { multiple?: boolean } };
  const entries = () => loadRegistry() as Entry[];

  test("a layered key lists its layers lowest first and always includes the person layer or the global layer", () => {
    for (const e of entries().filter((x) => x.layers)) {
      const order = ["band", "household", "person"];
      const idx = e.layers!.map((l) => order.indexOf(l));
      expect(idx.every((i) => i >= 0), e.key).toBe(true);
      expect([...idx].sort((a, b) => a - b), `${e.key} layers must run lowest to highest`).toEqual(idx);
      expect(e.layers!.includes("household") || e.layers!.includes("person"), e.key).toBe(true);
    }
  });

  test("the search block keys are layered as unions and their user defaults point at declared keys", () => {
    const byKey = new Map(entries().map((e) => [e.key, e]));
    for (const key of ["search.blocklists", "search.hosts.deny", "search.hosts.allow"]) {
      const e = byKey.get(key)!;
      expect(e.layers, key).toEqual(["band", "household", "person"]);
      expect(e.merge, key).toBe("union");
      expect(Object.keys(e.user_defaults_keys ?? {}).sort(), key).toEqual(["adult", "child", "teen"]);
    }
    for (const e of entries()) for (const target of Object.values(e.user_defaults_keys ?? {})) expect(byKey.has(target), `${e.key} -> ${target}`).toBe(true);
  });

  test("SafeSearch, web sources and page-text cleaning are overridable user defaults, never a fixed floor", () => {
    const byKey = new Map(entries().map((e) => [e.key, e]));
    expect(byKey.get("search.safe_search")?.layers).toEqual(["band", "household", "person"]);
    expect(byKey.get("search.safe_search")?.merge).toBe("override");
    expect(byKey.get("search.web_sources")?.layers).toEqual(["household", "person"]);
    const cleaning = byKey.get("search.page_text_cleaning") as unknown as { band_default: Record<string, boolean>; control: Record<string, string> };
    expect(cleaning.band_default).toEqual({ child: true, teen: true, adult: false });
    expect(cleaning.control.child).toBe("guardian");
    expect(cleaning.control.teen).toBe("guardian");
  });

  test("a setting value may live at a user-defaults row, and a user override may say who set it", () => {
    const base = { key: "search.hosts.deny", value: "example.com", hlc: "1:0:abcdef", source: "user" };
    expect(() => SettingValue.parse({ ...base, scope: "band:teen" })).not.toThrow();
    expect(() => SettingValue.parse({ ...base, scope: "person:p1", set_by: "admin-1" })).not.toThrow();
    expect(() => SettingValue.parse({ ...base, scope: "band:senior" })).toThrow();
  });

  test("a list override is a delta whose every entry carries who set it", () => {
    const entry = { item: "blp-gambling", set_by: "admin-1", hlc: "1:0:abcdef" };
    expect(() => SettingsDelta.parse({ add: [entry], remove: [] })).not.toThrow();
    expect(() => SettingsDelta.parse({ add: [{ item: "blp-gambling" }] })).toThrow();
  });
});

describe("EASE-OF-USE-01 ease keys", () => {
  const entries = () => loadRegistry().map((e) => SettingsKey.parse(e));
  const presets = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "ease", "presets.json"), "utf-8"));
  const easeNames = ["preset", "targets", "text_size", "spacing", "contrast", "motion", "reading_level", "simple_mode", "word_help", "read_aloud", "explainers"];

  test("every ease key is layered, overriding and self-service", () => {
    const byKey = new Map(entries().map((e) => [e.key, e]));
    for (const n of easeNames) {
      const e = byKey.get(`ease.${n}`);
      expect(e, `ease.${n}`).toBeDefined();
      expect(e!.layers, n).toEqual(["band", "household", "person"]);
      expect(e!.merge, n).toBe("override");
      expect(e!.self_service, n).toBe(true);
      expect(e!.lives_in, n).toBe("profile.ease");
    }
  });

  test("fine-grained ease keys default to the preset and offer it as an option", () => {
    const byKey = new Map(entries().map((e) => [e.key, e]));
    for (const n of ["targets", "text_size", "spacing", "contrast", "motion", "simple_mode", "word_help", "read_aloud", "explainers"]) {
      const e = byKey.get(`ease.${n}`)!;
      expect(e.default, n).toBe("preset");
      expect((e.range as { options: string[] }).options, n).toContain("preset");
    }
  });

  test("the Kids user defaults are Simple and Plain; Teens and Adults are Standard", () => {
    const byKey = new Map(entries().map((e) => [e.key, e]));
    expect(byKey.get("ease.preset")!.band_default).toEqual({ child: "simple", teen: "standard", adult: "standard" });
    expect(byKey.get("ease.reading_level")!.band_default).toEqual({ child: "plain", teen: "standard", adult: "standard" });
  });

  test("no safety, consent, privacy or credentials key is self-service", () => {
    for (const e of entries()) {
      if (!e.self_service) continue;
      expect(e.key.startsWith("ease."), `${e.key} is self_service but is not a comfort key`).toBe(true);
    }
  });

  test("presets.json sets every fine-grained ease key to a value its key offers", () => {
    const byKey = new Map(entries().map((e) => [e.key, e]));
    expect(Object.keys(presets.presets).sort()).toEqual(
      (byKey.get("ease.preset")!.range as { options: string[] }).options.slice().sort(),
    );
    for (const [name, set] of Object.entries(presets.presets) as [string, Record<string, string>][]) {
      for (const [k, v] of Object.entries(set)) {
        const opts = (byKey.get(`ease.${k}`)!.range as { options: string[] }).options;
        expect(opts, `${name}.${k}`).toContain(v);
        if (presets.values[k]) expect(presets.values[k][v], `${name}.${k}=${v} needs numbers`).toBeDefined();
      }
      const fine = easeNames.filter((n) => !["preset", "reading_level"].includes(n));
      expect(Object.keys(set).sort(), `${name} sets every fine-grained key`).toEqual(fine.slice().sort());
    }
    for (const [k, vals] of Object.entries(presets.values) as [string, Record<string, unknown>][]) {
      const opts = (byKey.get(`ease.${k}`)!.range as { options: string[] }).options.filter((o) => o !== "preset");
      expect(Object.keys(vals).sort(), `values.${k} covers every option`).toEqual(opts.slice().sort());
    }
  });
});
