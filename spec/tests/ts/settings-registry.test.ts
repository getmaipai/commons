// Round-trip the real registry through SettingsKey. A hand-edit that
// breaks an entry's shape would otherwise surface downstream in a
// consumer at boot.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SettingsKey } from "../../gen/ts/settings-key.js";

const REGISTRY_PATH = join(
  import.meta.dir,
  "..",
  "..",
  "settings",
  "keys.json",
);

function loadRegistry(): unknown[] {
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

describe("spec/settings/keys.json", () => {
  test("every entry parses as a SettingsKey", () => {
    const entries = loadRegistry();
    for (const entry of entries) {
      const key = (entry as { key?: unknown }).key;
      expect(
        () => SettingsKey.parse(entry),
        `entry "${String(key)}" failed SettingsKey.parse`,
      ).not.toThrow();
    }
  });

  test("every key is declared exactly once (one definition, one place)", () => {
    const entries = loadRegistry() as { key: string }[];
    const keys = entries.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("the retired turn pipeline toggle is absent", () => {
    const entries = loadRegistry() as Record<string, unknown>[];
    expect(entries.some((e) => e.key === "turn.pipeline.next")).toBe(false);
  });

  test("household.home is the household location selector and household.home_place is retired", () => {
    const entries = loadRegistry() as Record<string, unknown>[];
    const keys = new Map(
      entries.map((entry) => [entry.key as string, SettingsKey.parse(entry)]),
    );
    expect(keys.has("household.home_place")).toBe(false);
    const home = keys.get("household.home");
    expect(home).toBeDefined();
    expect(home?.scope).toBe("household");
    expect(home?.selector).toBe("location");
    expect(home?.range).toEqual({ multiple: false, allow_current: false });
    expect(home?.default).toBeNull();
    expect(home?.lives_in).toBe("household.system");
    expect(home?.honoured_by).toEqual(["home", "bot"]);
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
      "household.quiet_hours.from",
      "household.quiet_hours.to",
      "person.quiet_hours.from",
      "person.quiet_hours.to",
      "robot.initiative.enabled",
      "robot.initiative.tiers_spoken",
      "robot.initiative.max_offers_per_hour",
      "robot.initiative.accept_phrases",
      "person.robot.may_address",
      "person.robot.topics",
      "person.robot.greet_by_name",
      "person.robot.follow_up",
      "person.robot.playful_clips",
      "person.vision.watch",
      "person.vision.gestures",
      "vision.on_request.enabled",
      "robot.greetings.mode",
      "safety.alarm.sensors",
      "safety.alarm.voice",
      "safety.alarm.volume",
      "safety.alarm.child_line",
      "safety.alarm.repeat_seconds",
      "robot.live_view.enabled",
      "robot.live_view.who",
      "robot.offlan.tailnet",
      "robot.camera.watch_level",
      "robot.follow_up.seconds",
      "robot.idle.level",
      "robot.barge_in.open_mic",
      "robot.gestures.enabled",
      "robot.initiative.allowed_here",
    ];
    for (const key of required) expect(keys.has(key), key).toBe(true);
    expect(keys.get("robot.offlan.tailnet")?.default).toBe(false);
    expect(keys.get("robot.gestures.enabled")?.default).toBe(false);
    expect(keys.get("robot.initiative.allowed_here")?.default).toBe(false);
    expect(keys.get("person.vision.watch")?.default).toBe("presence");
    expect(keys.get("notifications.time_sensitive.robot")?.default).toBe(false);
    expect(keys.has("person.robot.may_address")).toBe(true);
    expect(keys.has("person.robot.greet_by_name")).toBe(true);
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
