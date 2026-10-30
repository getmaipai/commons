// Round-trips every fixture in spec/fixtures/records/ through its generated
// Zod model. This is the TS half of the proof required by platform plan 3:
// "home's check.sh round-trips every fixture in spec/fixtures/ through both
// generated model sets." The Python half is spec/gen/py/test_fixtures.py.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Person } from "../../gen/ts/person.js";
import { SettingValue } from "../../gen/ts/setting-value.js";
import { SettingsKey } from "../../gen/ts/settings-key.js";
import { MemoryRecord } from "../../gen/ts/memory-record.js";
import { PackageManifest } from "../../gen/ts/manifest.js";
import { SafetyResult } from "../../gen/ts/safety-result.js";
import { ModelCapabilities } from "../../gen/ts/model-capabilities.js";
import { Entity } from "../../gen/ts/entity.js";
import { List } from "../../gen/ts/list.js";
import { Relationship } from "../../gen/ts/relationship.js";
import { Grant } from "../../gen/ts/grant.js";
import { Issue } from "../../gen/ts/issue.js";
import { Conversation } from "../../gen/ts/conversation.js";
import { ChatFolder } from "../../gen/ts/chat-folder.js";
import { Device } from "../../gen/ts/device.js";
import { RobotState } from "../../gen/ts/robot-state.js";
import { DeviceCommand } from "../../gen/ts/device-command.js";
import { RobotSelfTestResult } from "../../gen/ts/robot-self-test-result.js";
import { RobotChannelFrame } from "../../gen/ts/robot-channel-frame.js";
import { RobotOffer } from "../../gen/ts/robot-offer.js";
import { RobotAssetManifest } from "../../gen/ts/robot-asset-manifest.js";
import { StackFitPlan } from "../../gen/ts/stack-fit-plan.js";
import { ContentCeiling } from "../../gen/ts/content-ceiling.js";
import { Source } from "../../gen/ts/source.js";
import { TurnSignal } from "../../gen/ts/turn-signal.js";
import { ReplyPlan } from "../../gen/ts/reply-plan.js";
import { SubjectRef } from "../../gen/ts/subject-ref.js";
import { ConversationTurn } from "../../gen/ts/conversation-turn.js";
import { OpenQuestion } from "../../gen/ts/open-question.js";
import { ReplyFeedback } from "../../gen/ts/reply-feedback.js";
import { TurnArtifact } from "../../gen/ts/turn-artifact.js";
import { File } from "../../gen/ts/file.js";
import { Share } from "../../gen/ts/share.js";
import { Artifact } from "../../gen/ts/artifact.js";
import { Project } from "../../gen/ts/project.js";
import { Feed } from "../../gen/ts/feed.js";
import { NewsItem } from "../../gen/ts/news-item.js";
import { NewsStory } from "../../gen/ts/news-story.js";
import { PageContext } from "../../gen/ts/page-context.js";
import { QuickAction } from "../../gen/ts/quick-action.js";
import { Alarm } from "../../gen/ts/alarm.js";
import { WorldPlace } from "../../gen/ts/world-place.js";
import { QuickTimer } from "../../gen/ts/quick-timer.js";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// ErrorEntry is standards-owned (std-v0.2.0), not generated here; the error
// catalogue's shape is imported from the sibling .github checkout, the same
// way spec/schemas/manifest.schema.json imports PrivacyRow by $ref. Resolved
// through MAIPAI_STANDARDS_DIR when set, falling back to the same relative
// sibling path as before - tests/py/_standards.py's own STANDARDS_DIR already
// does this on the Python side; a plain hardcoded "../../../../.github"
// static import only ever resolves from the plain checkout depth and breaks
// under a nested worktree (found live: this worktree sits at
// commons/.claude/worktrees/<id>/spec, one directory deeper than the plain
// checkout the hardcoded climb assumed, so the module could never be found).
const STANDARDS_DIR = process.env.MAIPAI_STANDARDS_DIR ?? join(import.meta.dir, "..", "..", "..", "..", ".github");
const { ErrorEntry } = await import(join(STANDARDS_DIR, "standards", "gen", "ts", "error-entry.js"));

const FIXTURES_DIR = join(import.meta.dir, "..", "..", "fixtures", "records");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), "utf-8"));
}

describe("record fixtures validate against their generated Zod models", () => {
  const row = {
    id: "weather-lookup",
    destination: "Open-Meteo",
    when: "on request",
    what: "weather request",
    who: "Open-Meteo",
    opt_in: true,
    retention: "90 days",
  };
  const manifestWithRow = (dataSource: Record<string, unknown>) => ({
    id: "bedtime-reminder", version: "0.1.0", kind: "plugin", category: "Family",
    display: "Bedtime reminder", description: "Sets a spoken reminder.", author: "MaiPai",
    license: "AGPL-3.0", platforms: ["home", "bot"], min_role: "child",
    consequential: false, offline: "full", min_app: "0.1.0", tier: 0,
    incognito: "unaffected", data_sources: [dataSource],
  });
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const manifestSchema = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "schemas.resolved", "manifest.schema.json"), "utf8"));
  for (const schemaName of ["answer-block.schema.json", "settings-key.schema.json", "settings-area.schema.json", "tour.schema.json", "privacy-row.schema.json"]) {
    const schema = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "schemas.resolved", schemaName), "utf8"));
    ajv.addSchema(schema, schemaName === "privacy-row.schema.json" ? "https://getmaipai.github.io/shared/spec/schemas/privacy-row.schema.json" : schema.$id);
  }
  const validateManifest = ajv.compile(manifestSchema);

  test("a data_sources row with an attribution and hosts validates", () => {
    expect(validateManifest(manifestWithRow({ ...row, attribution: "Weather data by Open-Meteo.com (CC BY 4.0)", hosts: ["api.open-meteo.com"] }))).toBe(true);
  });
  test("a data_sources row with neither still validates", () => {
    expect(validateManifest(manifestWithRow(row))).toBe(true);
  });
  test("a data_sources row with an unknown extra field is still rejected", () => {
    expect(validateManifest(manifestWithRow({ ...row, unknown: true }))).toBe(false);
  });

  test("person.example.json", () => {
    expect(() => Person.parse(loadFixture("person.example.json"))).not.toThrow();
  });

  test("setting-value.example.json", () => {
    expect(() =>
      SettingValue.parse(loadFixture("setting-value.example.json")),
    ).not.toThrow();
  });

  test("alarm.example.json", () => expect(() => Alarm.parse(loadFixture("alarm.example.json"))).not.toThrow());
  test("world-place.example.json", () => expect(() => WorldPlace.parse(loadFixture("world-place.example.json"))).not.toThrow());
  test("quick-timer.example.json", () => expect(() => QuickTimer.parse(loadFixture("quick-timer.example.json"))).not.toThrow());
  test("clock record invalid examples are rejected", () => {
    for (const [model, name] of [[Alarm, "alarm.invalid.example.json"], [WorldPlace, "world-place.invalid.example.json"], [QuickTimer, "quick-timer.invalid.example.json"]] as const) {
      expect(() => model.parse(loadFixture(name))).toThrow();
    }
    expect(() => WorldPlace.parse({ ...loadFixture("world-place.example.json") as object, person: undefined })).toThrow();
  });
  test("world place zone is accepted by Intl.DateTimeFormat", () => {
    const place = WorldPlace.parse(loadFixture("world-place.example.json"));
    expect(() => new Intl.DateTimeFormat("en", { timeZone: place.zone })).not.toThrow();
  });

  test("settings-key.example.json", () => {
    expect(() =>
      SettingsKey.parse(loadFixture("settings-key.example.json")),
    ).not.toThrow();
  });

  for (const kind of ["memory", "memory-legacy", "entity", "episode", "in-project", "device-id-device", "device-id-null"]) {
    test(`memory-record.${kind}.example.json`, () => {
      expect(() =>
        MemoryRecord.parse(loadFixture(`memory-record.${kind}.example.json`)),
      ).not.toThrow();
    });
  }

  for (const kind of ["person", "pet", "place"]) {
    test(`entity.${kind}.example.json`, () => {
      expect(() => Entity.parse(loadFixture(`entity.${kind}.example.json`))).not.toThrow();
    });
  }

  for (const kind of ["place-exact", "place-area", "place-named-only"]) {
    test(`entity.${kind}.example.json`, () => {
      expect(() => Entity.parse(loadFixture(`entity.${kind}.example.json`))).not.toThrow();
    });
  }

  for (const kind of ["shopping", "todo", "custom"]) {
    test(`list.${kind}.example.json`, () => {
      expect(() => List.parse(loadFixture(`list.${kind}.example.json`))).not.toThrow();
    });
  }

  // Relationship fixtures cover the two-axis cases and the optional reader name.
  for (const kind of ["stated", "estranged", "inferred", "called"]) {
    test(`relationship.${kind}.example.json`, () => {
      expect(() => Relationship.parse(loadFixture(`relationship.${kind}.example.json`))).not.toThrow();
    });
  }

  test("grant.example.json", () => {
    expect(() => Grant.parse(loadFixture("grant.example.json"))).not.toThrow();
  });

  test("issue.example.json", () => {
    expect(() => Issue.parse(loadFixture("issue.example.json"))).not.toThrow();
  });

  test("conversation.example.json", () => {
    expect(() => Conversation.parse(loadFixture("conversation.example.json"))).not.toThrow();
  });

  test("conversation.device-id-device.example.json", () => {
    expect(() => Conversation.parse(loadFixture("conversation.device-id-device.example.json"))).not.toThrow();
  });

  test("conversation.device-id-null.example.json", () => {
    expect(() => Conversation.parse(loadFixture("conversation.device-id-null.example.json"))).not.toThrow();
  });

  test("device_id fixtures reject a bad pattern", () => {
    expect(() => MemoryRecord.parse(loadFixture("memory-record.device-id-invalid.invalid.example.json"))).toThrow();
    expect(() => Conversation.parse(loadFixture("conversation.device-id-invalid.invalid.example.json"))).toThrow();
  });

  test("conversation.in-folder.example.json", () => {
    expect(() => Conversation.parse(loadFixture("conversation.in-folder.example.json"))).not.toThrow();
  });

  test("a conversation's folder_id must be a folder id", () => {
    const conv = loadFixture("conversation.in-folder.example.json") as Record<string, unknown>;
    expect(() => Conversation.parse({ ...conv, folder_id: "proj-a1b2c3" })).toThrow();
    expect(() => Conversation.parse({ ...conv, folder_id: null })).not.toThrow();
  });

  for (const kind of ["example", "parent-made.example", "project.example"]) {
    test(`chat-folder.${kind}.json`, () => {
      expect(() => ChatFolder.parse(loadFixture(`chat-folder.${kind}.json`))).not.toThrow();
    });
  }

  test("a chat folder refuses an empty name, a bad id and an unknown field", () => {
    const folder = loadFixture("chat-folder.example.json") as Record<string, unknown>;
    expect(() => ChatFolder.parse({ ...folder, name: "" })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, name: "x".repeat(81) })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, id: "project-a1b2c3" })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, not_a_field: "be brief" })).toThrow();
  });

  test("a v0.1.87 chat folder still validates and reads with the new defaults (PROJECTS-P1)", () => {
    const folder = ChatFolder.parse(loadFixture("chat-folder.example.json"));
    expect(folder.color).toBe("neutral");
    expect(folder.icon).toBe("folder");
    expect(folder.description).toBe("");
    expect(folder.instructions).toBe("");
    expect(folder.pinned).toBe(false);
    expect(folder.pinned_at).toBeNull();
    expect(folder.archived_at).toBeNull();
    expect(folder.memory_mode).toBe("shared");
    expect(folder.shares).toEqual([]);
  });

  test("a chat folder refuses a hex colour, an unknown colour, a bad icon, long text, a bad share and an unknown memory mode", () => {
    const folder = loadFixture("chat-folder.project.example.json") as Record<string, unknown>;
    expect(() => ChatFolder.parse({ ...folder, color: "#ff0000" })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, color: "purple" })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, icon: "Folder Icon" })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, icon: "📁" })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, description: "x".repeat(501) })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, description: "x".repeat(500) })).not.toThrow();
    expect(() => ChatFolder.parse({ ...folder, instructions: "x".repeat(1501) })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, instructions: "x".repeat(1500) })).not.toThrow();
    expect(() => ChatFolder.parse({ ...folder, memory_mode: "everything" })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, shares: [{ person: "person-d4e5f6", role: "owner" }] })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, shares: [{ person: "nobody", role: "can_use" }] })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, shares: [{ person: "person-d4e5f6", role: "can_use", extra: 1 }] })).toThrow();
    expect(() => ChatFolder.parse({ ...folder, pinned: "yes" })).toThrow();
  });

  test("every project icon fixture and the vocab file agree, and every colour is a kit hue name", () => {
    const vocab = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "vocab", "project-icons.json"), "utf8")) as { icons: string[] };
    expect(new Set(vocab.icons).size).toBe(vocab.icons.length);
    expect(vocab.icons).toContain("folder");
    for (const name of vocab.icons) expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const folder = ChatFolder.parse(loadFixture("chat-folder.project.example.json"));
    expect(vocab.icons).toContain(folder.icon);
  });

  test("a memory record carries an optional folder_id, null by default, and refuses a bad one", () => {
    const base = loadFixture("memory-record.memory.example.json") as Record<string, unknown>;
    expect(MemoryRecord.parse(base).folder_id).toBeNull();
    expect(MemoryRecord.parse(loadFixture("memory-record.in-project.example.json")).folder_id).toBe("folder-g7h8i9");
    expect(() => MemoryRecord.parse({ ...base, folder_id: "project-g7h8i9" })).toThrow();
  });

  test("project.example.json", () => {
    expect(() => Project.parse(loadFixture("project.example.json"))).not.toThrow();
  });

  test("project.failed.example.json", () => {
    expect(() => Project.parse(loadFixture("project.failed.example.json"))).not.toThrow();
  });

  test("conversation.side.example.json", () => {
    const parsed = Conversation.parse(loadFixture("conversation.side.example.json"));
    expect(parsed.placement).toBe("side");
    expect(Conversation.parse(loadFixture("conversation.example.json")).placement).toBe("chat");
    expect(() => Conversation.parse(loadFixture("conversation.placement-invalid.invalid.example.json"))).toThrow();
  });

  test("conversation.temporary.example.json", () => {
    expect(() => Conversation.parse(loadFixture("conversation.temporary.example.json"))).not.toThrow();
  });

  test("device.example.json", () => {
    expect(() => Device.parse(loadFixture("device.example.json"))).not.toThrow();
  });

  for (const kind of ["reachy-mini", "reachy-mini-eyes", "maipai-build", "stackchan"]) {
    test(`device.robot-${kind}.example.json`, () => {
      expect(() => Device.parse(loadFixture(`device.robot-${kind}.example.json`))).not.toThrow();
    });
  }

  test("StackChan capabilities match the vocabulary in order", () => {
    const fixture = loadFixture("device.robot-stackchan.example.json") as { capabilities: string[] };
    const vocabulary = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "vocab", "capabilities.json"), "utf8")) as { capabilities: string[] };
    expect(fixture.capabilities).toEqual([
      "lease", "estop", "head_pan_tilt", "light_ring", "speaker", "camera", "battery_readout", "speech_pod",
    ]);
    for (const capability of fixture.capabilities) expect(vocabulary.capabilities).toContain(capability);
  });

  for (const kind of ["starting", "idle", "listening", "thinking", "speaking", "reconnecting", "sleeping", "unknown-battery", "minimal", "held", "resting", "degraded", "motor-reboot-offer"]) {
    test(`robot-state.${kind}.example.json`, () => {
      expect(() => RobotState.parse(loadFixture(`robot-state.${kind}.example.json`))).not.toThrow();
    });
  }

  test("device-command fixtures cover every kind and reject a mismatched payload", () => {
    const commands = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "fixtures", "records", "device-command.kinds.example.json"), "utf-8")) as unknown[];
    expect(commands).toHaveLength(16);
    for (const command of commands) expect(() => DeviceCommand.parse(command)).not.toThrow();
    const invalid = { ...(commands[0] as object), kind: "capture_request" };
    expect(() => DeviceCommand.parse(invalid)).toThrow();
    const fixtures = join(import.meta.dir, "..", "..", "fixtures", "records");
    const waitingWithText = JSON.parse(readFileSync(join(fixtures, "device-command.notify-waiting-with-text.invalid.example.json"), "utf-8"));
    expect(() => DeviceCommand.parse(waitingWithText)).toThrow();
    const offer = (commands as { kind: string; payload: Record<string, unknown> }[]).find((command) => command.kind === "offer")!;
    expect(offer.payload).not.toHaveProperty("text");
    expect(() => DeviceCommand.parse({ ...offer, payload: { ...offer.payload, text: "prepared content" } })).toThrow();
    const selfTest = (commands as { kind: string; payload: Record<string, unknown> }[]).find((command) => command.kind === "self_test")!;
    expect(() => DeviceCommand.parse(selfTest)).not.toThrow();
    expect(() => DeviceCommand.parse({ ...selfTest, payload: { ...selfTest.payload, part: "camera" } })).toThrow();
    expect(() => DeviceCommand.parse({ ...selfTest, payload: { ...selfTest.payload, extra: true } })).toThrow();
  });

  test("motor_reboot command names at least one distinct motor and takes nothing else", () => {
    const commands = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "fixtures", "records", "device-command.kinds.example.json"), "utf-8")) as { kind: string; payload: Record<string, unknown> }[];
    const reboot = commands.find((command) => command.kind === "motor_reboot")!;
    expect(reboot.payload).toEqual({ motors: ["stewart_3"] });
    for (const payload of [{}, { motors: [] }, { motors: ["a", "a"] }, { motors: [""] }, { motors: "a" }, { motors: ["a"], force: true }]) {
      expect(() => DeviceCommand.parse({ ...reboot, payload }), JSON.stringify(payload)).toThrow();
    }
  });

  test("robot-state motors_reboot_offer: present validates, omitted and empty validate, bad shapes are rejected", () => {
    const offer = RobotState.parse(loadFixture("robot-state.motor-reboot-offer.example.json"));
    expect(offer.motors_reboot_offer).toEqual(["stewart_3"]);
    expect(RobotState.parse(loadFixture("robot-state.degraded.example.json")).motors_reboot_offer).toBeUndefined();
    const base = loadFixture("robot-state.motor-reboot-offer.example.json") as Record<string, unknown>;
    expect(RobotState.parse({ ...base, motors_reboot_offer: [] }).motors_reboot_offer).toEqual([]);
    for (const bad of [{ ...base, motors_reboot_offer: "stewart_3" }, { ...base, motors_reboot_offer: ["a", "a"] }, { ...base, motors_reboot_offer: [""] }]) {
      expect(() => RobotState.parse(bad)).toThrow();
    }
  });

  test("robot channel frames accept voice answers and reject gesture answers", () => {
    const fixtures = join(import.meta.dir, "..", "..", "fixtures", "records");
    const frames = JSON.parse(readFileSync(join(fixtures, "robot-channel-frame.kinds.example.json"), "utf-8")) as unknown[];
    expect(frames).toHaveLength(4);
    for (const frame of frames) expect(() => RobotChannelFrame.parse(frame)).not.toThrow();
    const invalid = JSON.parse(readFileSync(join(fixtures, "robot-channel-frame.gesture-answer.invalid.example.json"), "utf-8"));
    expect(() => RobotChannelFrame.parse(invalid)).toThrow();
  });

  test("robot offer fixture validates", () => {
    expect(() => RobotOffer.parse(loadFixture("robot-offer.example.json"))).not.toThrow();
  });

  test("robot asset pins validate and contain only checksum and licence backed non-move assets", () => {
    const pins = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "assets", "robot-assets.json"), "utf-8")) as unknown[];
    expect(pins).toHaveLength(7);
    for (const pin of pins) {
      const parsed = RobotAssetManifest.parse(pin);
      expect(parsed.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(parsed.licence.trim()).not.toBe("");
      expect(parsed.kind).not.toBe("moves");
      expect(`${parsed.id} ${parsed.file} ${parsed.source_url}`).not.toMatch(/firmware/i);
    }
  });

  test("safety alarm notification declaration is immediate, fixed and household-wide", () => {
    const manifest = PackageManifest.parse(loadFixture("manifest.example.json"));
    const alarm = manifest.notifications?.find((item) => item.id === "safety.alarm");
    expect(alarm).toMatchObject({ level: "immediate", configurable: false, audience: "household", actions: ["acknowledge", "quiet_here", "false_alarm"] });
  });

  test("robot-state motors_latched, motors_stuck and thermal: present validates, omitted still validates, bad shapes are rejected", () => {
    const degraded = RobotState.parse(loadFixture("robot-state.degraded.example.json"));
    expect(degraded.motors_latched).toEqual(["body_yaw"]);
    expect(degraded.motors_stuck).toBe(true);
    expect(degraded.thermal?.level).toBe("gestures_suspended");
    const minimal = RobotState.parse(loadFixture("robot-state.minimal.example.json"));
    expect(minimal.motors_latched).toBeUndefined();
    expect(minimal.thermal).toBeUndefined();
    const base = loadFixture("robot-state.degraded.example.json") as Record<string, unknown>;
    const thermal = base.thermal as Record<string, unknown>;
    expect(RobotState.parse({ ...base, thermal: { ...thermal, temp_c: null, fault: true } }).thermal?.temp_c).toBeNull();
    expect(RobotState.parse({ ...base, motors_latched: [] }).motors_latched).toEqual([]);
    for (const bad of [
      { ...base, motors_latched: "body_yaw" },
      { ...base, motors_latched: ["a", "a"] },
      { ...base, motors_stuck: "yes" },
      { ...base, thermal: { ...thermal, level: "melting" } },
      { ...base, thermal: { ...thermal, vision_hz: -1 } },
      { ...base, thermal: { level: "nominal" } },
      { ...base, thermal: { ...thermal, extra: 1 } },
    ]) {
      expect(() => RobotState.parse(bad)).toThrow();
    }
  });

  test("robot-state activity: an unlisted value is still rejected", () => {
    const body = { ...(loadFixture("robot-state.idle.example.json") as object), activity: "napping" };
    expect(() => RobotState.parse(body)).toThrow();
  });

  test("robot-state app_version: present, null and omitted validate; wrong type is rejected", () => {
    const present = RobotState.parse(loadFixture("robot-state.idle.example.json"));
    expect(present.app_version).toBe("0.4.2");
    expect(RobotState.parse(loadFixture("robot-state.unknown-battery.example.json")).app_version).toBeNull();
    expect(RobotState.parse(loadFixture("robot-state.minimal.example.json")).app_version).toBeUndefined();
    const body = { ...(loadFixture("robot-state.idle.example.json") as object), app_version: 4 };
    expect(() => RobotState.parse(body)).toThrow();
  });

  test("robot-state clock_synced is optional and boolean", () => {
    expect(RobotState.parse(loadFixture("robot-state.clock-synced.example.json")).clock_synced).toBe(true);
    expect(RobotState.parse(loadFixture("robot-state.clock-unsynced.example.json")).clock_synced).toBe(false);
    expect(RobotState.parse(loadFixture("robot-state.minimal.example.json")).clock_synced).toBeUndefined();
    expect(() => RobotState.parse(loadFixture("robot-state.clock-synced-invalid.example.json"))).toThrow();
  });

  test("robot-state watch_level is optional and closed", () => {
    const idle = loadFixture("robot-state.idle.example.json") as any;
    expect(RobotState.parse(idle).watch_level).toBe("presence");
    const bare = loadFixture("robot-state.minimal.example.json") as any;
    expect(RobotState.parse(bare).watch_level).toBeUndefined();
    expect(() => RobotState.parse({ ...idle, watch_level: "always" })).toThrow();
  });

  test("robot-state motion and put_down_count: optional, null motion allowed, bad values rejected", () => {
    const held = RobotState.parse(loadFixture("robot-state.held.example.json"));
    expect(held.motion).toBe("held");
    expect(held.put_down_count).toBe(0);
    expect(RobotState.parse(loadFixture("robot-state.resting.example.json")).motion).toBe("resting");
    const bare = RobotState.parse(loadFixture("robot-state.minimal.example.json"));
    expect(bare.motion).toBeUndefined();
    expect(bare.put_down_count).toBeUndefined();
    const idle = loadFixture("robot-state.idle.example.json") as object;
    expect(RobotState.parse({ ...idle, motion: null }).motion).toBeNull();
    expect(() => RobotState.parse({ ...idle, motion: "flying" })).toThrow();
    expect(() => RobotState.parse({ ...idle, unexpected: true })).toThrow();
    expect(() => RobotState.parse({ ...idle, put_down_count: -1 })).toThrow();
    expect(() => RobotState.parse({ ...idle, put_down_count: 1.5 })).toThrow();
    expect(() => RobotState.parse({ ...idle, put_down_count: null })).toThrow();
  });

  test("robot-state activity enum is unchanged by the motion fields", () => {
    for (const value of ["held", "resting", "carried"]) {
      const body = { ...(loadFixture("robot-state.idle.example.json") as object), activity: value };
      expect(() => RobotState.parse(body)).toThrow();
    }
  });

  for (const kind of ["yes", "slow", "no", "unknown", "multi-role"]) {
    test(`stack-fit-plan.${kind}.example.json`, () => {
      expect(() => StackFitPlan.parse(loadFixture(`stack-fit-plan.${kind}.example.json`))).not.toThrow();
    });
  }

  test("stack-fit-plan rejects inconsistent unknown and estimated figures", () => {
    const base = loadFixture("stack-fit-plan.yes.example.json") as any;
    const unknownLow = structuredClone(base);
    unknownLow.total = { low: 1, high: null, source: "unknown", as_of: "2026-09-30" };
    expect(() => StackFitPlan.parse(unknownLow)).toThrow();
    const estimatedNull = structuredClone(base);
    estimatedNull.total = { low: null, high: 2, source: "estimated", as_of: "2026-09-30" };
    expect(() => StackFitPlan.parse(estimatedNull)).toThrow();
  });

  test("source.example.json", () => {
    expect(() => Source.parse(loadFixture("source.example.json"))).not.toThrow();
  });

  test("source.archive.example.json", () => {
    expect(() => Source.parse(loadFixture("source.archive.example.json"))).not.toThrow();
  });

  test("source.reference.example.json carries snapshot attribution", () => {
    const parsed = Source.parse(loadFixture("source.reference.example.json"));
    expect(parsed.kind).toBe("reference");
    expect(parsed.snapshot_date).toBe("2026-09-14");
    expect(parsed.licence).toBe("cc-by-sa-4.0");
    expect(parsed.local_path).toBe("/api/reference/wikipedia/A/Sourdough");
  });

  for (const kind of ["feed", "news-item", "news-story"]) {
    test(`${kind}.example.json`, () => {
      const data = loadFixture(`${kind}.example.json`);
      const record = kind === "feed" ? Feed : kind === "news-item" ? NewsItem : NewsStory;
      expect(() => record.parse(data)).not.toThrow();
      expect(record.parse(data)).toEqual(data);
    });
  }

  test("manifest.example.json", () => {
    expect(() =>
      PackageManifest.parse(loadFixture("manifest.example.json")),
    ).not.toThrow();
  });

  test("manifest.companion-style-adapter.example.json", () => {
    expect(() => PackageManifest.parse(loadFixture("manifest.companion-style-adapter.example.json"))).not.toThrow();
  });

  test("manifest.reference.example.json", () => {
    expect(() =>
      PackageManifest.parse(loadFixture("manifest.reference.example.json")),
    ).not.toThrow();
  });

  test("manifest.project.example.json", () => {
    expect(() =>
      PackageManifest.parse(loadFixture("manifest.project.example.json")),
    ).not.toThrow();
  });

  // project-plan.example.json is a project-kind package's own plan.json body
  // (PROJECT-PKGTYPE-01, home docs/BACKLOG.md): a bare ProjectPlan, not yet
  // part of a running Project record, so there's no separate ProjectPlan
  // export to import - Project.shape.plan is the same sub-schema Zod
  // already gives every strict z.object(), the same way every other
  // $defs-bearing schema in this repo (subject-ref, turn-artifact,
  // reply-plan, conversation-turn, model-capabilities, turn-signal) is only
  // ever exported as its single top-level type, never per-$def.
  test("project-plan.example.json", () => {
    expect(() =>
      Project.shape.plan.parse(loadFixture("project-plan.example.json")),
    ).not.toThrow();
  });

  test("safety-result.example.json", () => {
    expect(() =>
      SafetyResult.parse(loadFixture("safety-result.example.json")),
    ).not.toThrow();
  });

  for (const kind of ["chat", "image", "mlx-serve", "sherpa-onnx-node", "pocket-tts", "judge-role", "rerank-role", "music-role", "background-turns", "vision-role", "vision-chat"]) {
    test(`model-capabilities.${kind}.example.json`, () => {
      expect(() =>
        ModelCapabilities.parse(loadFixture(`model-capabilities.${kind}.example.json`)),
      ).not.toThrow();
    });
  }

  test("model-capabilities with an unknown role is rejected", () => {
    const bad = { ...(loadFixture("model-capabilities.chat.example.json") as Record<string, unknown>), role: "nonsense" };
    expect(() => ModelCapabilities.parse(bad)).toThrow();
  });

  test("model_cutoff is an optional calendar date", () => {
    const fixture = loadFixture("model-capabilities.chat.example.json") as Record<string, unknown>;
    expect(ModelCapabilities.parse({ ...fixture, model_cutoff: "2024-12-31" }).model_cutoff).toBe("2024-12-31");
    expect(() => ModelCapabilities.parse({ ...fixture, model_cutoff: "late 2024" })).toThrow();
  });

  test("TOOL-OFFER-01: max_tools permits a bounded measured set and rejects caps over sixteen", () => {
    const fixture = loadFixture("model-capabilities.chat.example.json") as { turn_budget: Record<string, unknown> };
    expect(ModelCapabilities.parse({ ...fixture, turn_budget: { ...fixture.turn_budget, max_tools: 16 } }).turn_budget?.max_tools).toBe(16);
    expect(() =>
      ModelCapabilities.parse({ ...fixture, turn_budget: { ...fixture.turn_budget, max_tools: 17 } }),
    ).toThrow();
  });

  test("model-capabilities: a vision model declares image input with its projector (VISION-01a)", () => {
    const parsed = ModelCapabilities.parse(loadFixture("model-capabilities.vision-role.example.json"));
    expect(parsed.image_input?.projector.file).toBe("mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf");
  });

  test("model-capabilities that declares image input without a projector is rejected (VISION-01a)", () => {
    const bad = { ...(loadFixture("model-capabilities.vision-role.example.json") as Record<string, unknown>), image_input: {} };
    expect(() => ModelCapabilities.parse(bad)).toThrow();
  });

  test("model-capabilities with a projector that has no checksum is rejected (VISION-01a)", () => {
    const fixture = loadFixture("model-capabilities.vision-role.example.json") as { image_input: { projector: { file: string; download: Record<string, unknown> } } };
    const { sha256: _sha256, ...download } = fixture.image_input.projector.download;
    const bad = { ...fixture, image_input: { projector: { ...fixture.image_input.projector, download } } };
    expect(() => ModelCapabilities.parse(bad)).toThrow();
  });

  test("model-capabilities: a chat model reads pictures and declares it has no thinking mode (VISION-02a)", () => {
    const parsed = ModelCapabilities.parse(loadFixture("model-capabilities.vision-chat.example.json"));
    expect(parsed.role).toBe("chat");
    expect(parsed.image_input?.projector.file).toBe("mmproj-Qwen3VL-8B-Instruct-Q8_0.gguf");
    expect(parsed.thinking_mode).toBe("none");
  });

  test("model-capabilities with an unknown thinking_mode is rejected (VISION-02a)", () => {
    const bad = { ...(loadFixture("model-capabilities.vision-chat.example.json") as Record<string, unknown>), thinking_mode: "sometimes" };
    expect(() => ModelCapabilities.parse(bad)).toThrow();
  });

  test("model-capabilities written before thinking_mode still validates without it (VISION-02a)", () => {
    expect(ModelCapabilities.parse(loadFixture("model-capabilities.chat.example.json")).thinking_mode).toBeUndefined();
  });

  test("model-capabilities: a text-only model carries no image_input (VISION-01a)", () => {
    expect(ModelCapabilities.parse(loadFixture("model-capabilities.chat.example.json")).image_input).toBeUndefined();
  });

  test("model-capabilities.chat-footprints.example.json", () => {
    expect(() => ModelCapabilities.parse(loadFixture("model-capabilities.chat-footprints.example.json"))).not.toThrow();
  });

  for (const band of ["child", "teen", "adult"]) {
    test(`content-ceiling.${band}.example.json`, () => {
      expect(() =>
        ContentCeiling.parse(loadFixture(`content-ceiling.${band}.example.json`)),
      ).not.toThrow();
    });
  }

  test("every content-ceiling band carries the identical floor - it documents an invariant, not a per-band setting", () => {
    const floors = ["child", "teen", "adult"].map(
      (band) => (loadFixture(`content-ceiling.${band}.example.json`) as { floor: string[] }).floor,
    );
    expect(floors[0]).toEqual(floors[1]);
    expect(floors[1]).toEqual(floors[2]);
  });

  test("turn-signal.example.json", () => {
    expect(() => TurnSignal.parse(loadFixture("turn-signal.example.json"))).not.toThrow();
  });

  test("turn-signal.computed.example.json", () => {
    expect(() =>
      TurnSignal.parse(loadFixture("turn-signal.computed.example.json")),
    ).not.toThrow();
  });

  test("reply-plan.example.json", () => {
    expect(() => ReplyPlan.parse(loadFixture("reply-plan.example.json"))).not.toThrow();
  });

  // CAPTURE-REQ-01: the optional ninth move. Absent means forbidden, so the
  // plan without it stays valid; a present state must be one of the three.
  test("reply-plan capture move is optional, additive and closed", () => {
    const base = loadFixture("reply-plan.example.json") as any;
    expect("capture" in base.moves).toBe(false);
    const withCapture = loadFixture("reply-plan.capture.example.json") as any;
    expect(withCapture.age_band).toBe("child");
    expect(ReplyPlan.parse(withCapture).moves.capture).toBe("allowed");
    for (const state of ["required", "allowed", "forbidden"]) {
      const plan = { ...base, moves: { ...base.moves, capture: state } };
      expect(ReplyPlan.parse(plan).moves.capture).toBe(state);
    }
    expect(() =>
      ReplyPlan.parse({ ...base, moves: { ...base.moves, capture: "maybe" } }),
    ).toThrow();
    expect(() =>
      ReplyPlan.parse({ ...base, moves: { ...base.moves, record: "allowed" } }),
    ).toThrow();
  });

  // SPEC-01's own acceptance: round-trip fixtures for all three SubjectRef
  // variants, and the validator refuses a world reference carrying an
  // entity_id (the second test below).
  for (const kind of ["household", "world", "unresolved"]) {
    test(`subject-ref.${kind}.example.json`, () => {
      expect(() => SubjectRef.parse(loadFixture(`subject-ref.${kind}.example.json`))).not.toThrow();
    });
  }

  test("a world SubjectRef carrying an entity_id is refused", () => {
    const world = loadFixture("subject-ref.world.example.json") as Record<string, unknown>;
    expect(() => SubjectRef.parse({ ...world, entity_id: "ent-p7q8r9" })).toThrow();
  });

  for (const kind of ["conversation-turn", "conversation-turn.branch"]) {
    test(`${kind}.example.json`, () => {
      expect(() => ConversationTurn.parse(loadFixture(`${kind}.example.json`))).not.toThrow();
    });
  }

  test("open-question.example.json", () => {
    expect(() => OpenQuestion.parse(loadFixture("open-question.example.json"))).not.toThrow();
  });

  test("reply-feedback.example.json", () => {
    expect(() => ReplyFeedback.parse(loadFixture("reply-feedback.example.json"))).not.toThrow();
  });

  test("reply-feedback.reasons.example.json: several reasons and a note", () => {
    const parsed = ReplyFeedback.parse(loadFixture("reply-feedback.reasons.example.json"));
    expect(parsed.reasons).toEqual(["wrong", "too_long"]);
    expect(parsed.note).toBe("The opening hours were for the wrong branch.");
  });

  test("reply-feedback: an older label without reasons or note still parses, with empty defaults", () => {
    const parsed = ReplyFeedback.parse(loadFixture("reply-feedback.example.json"));
    expect(parsed.reasons).toEqual([]);
    expect(parsed.note).toBeNull();
  });

  test("reply-feedback: a repeated reason, an unknown reason and an over-long note are refused", () => {
    const base = loadFixture("reply-feedback.reasons.example.json") as Record<string, unknown>;
    expect(() => ReplyFeedback.parse({ ...base, reasons: ["wrong", "wrong"] })).toThrow();
    expect(() => ReplyFeedback.parse({ ...base, reasons: ["boring"] })).toThrow();
    expect(() => ReplyFeedback.parse({ ...base, note: "x".repeat(1001) })).toThrow();
  });

  for (const kind of ["lookup", "card", "procedure", "comparison", "document"]) {
    test(`turn-artifact.${kind}.example.json`, () => {
      expect(() => TurnArtifact.parse(loadFixture(`turn-artifact.${kind}.example.json`))).not.toThrow();
    });
  }

  for (const name of ["file.example.json", "file.made-image.example.json"]) {
    test(name, () => {
      expect(() => File.parse(loadFixture(name))).not.toThrow();
    });
  }

  test("file.library-envelope.example.json carries name, audience and the trash envelope", () => {
    const f = File.parse(loadFixture("file.library-envelope.example.json"));
    expect(f.name).toBe("Otters in a kitchen");
    expect(f.audience).toBe("all-ages");
    expect(f.deleted_at).toBe("2026-10-18T12:00:00Z");
    expect(f.trash_until).toBe("2026-11-17T12:00:00Z");
  });

  test("file.adult-only.example.json is valid with audience adult-only and no trash", () => {
    const f = File.parse(loadFixture("file.adult-only.example.json"));
    expect(f.audience).toBe("adult-only");
    expect(f.deleted_at ?? null).toBeNull();
  });

  test("a file without the new fields reads as before", () => {
    const f = File.parse(loadFixture("file.example.json"));
    expect(f.name).toBeUndefined();
    expect(f.audience).toBeUndefined();
    expect(f.deleted_at ?? null).toBeNull();
    expect(f.trash_until ?? null).toBeNull();
  });

  test("file.invalid-audience.example.json is rejected", () => {
    expect(() => File.parse(loadFixture("file.invalid-audience.example.json"))).toThrow();
  });

  test("share.example.json", () => {
    expect(() => Share.parse(loadFixture("share.example.json"))).not.toThrow();
  });

  for (const kind of ["v1", "v2"]) {
    test(`artifact.${kind}.example.json`, () => {
      expect(() => Artifact.parse(loadFixture(`artifact.${kind}.example.json`))).not.toThrow();
    });
  }

  test("an artifact's second version chains to the first by id", () => {
    const v1 = loadFixture("artifact.v1.example.json") as { id: string };
    const v2 = loadFixture("artifact.v2.example.json") as { parent_version: string };
    expect(v2.parent_version).toBe(v1.id);
  });

  test("error catalogue entries", () => {
    const errors = JSON.parse(
      readFileSync(
        join(import.meta.dir, "..", "..", "errors", "errors.json"),
        "utf-8",
      ),
    ) as unknown[];
    expect(errors.length).toBeGreaterThan(0);
    for (const entry of errors) {
      expect(() => ErrorEntry.parse(entry)).not.toThrow();
    }
  });
});

describe("a bad record is rejected, not silently accepted", () => {
  test("person missing a required field fails", () => {
    const bad = loadFixture("person.example.json") as Record<string, unknown>;
    delete bad.role;
    expect(() => Person.parse(bad)).toThrow();
  });

  test("person with an unknown extra field fails (additionalProperties: false)", () => {
    const bad = { ...(loadFixture("person.example.json") as Record<string, unknown>), extra: "nope" };
    expect(() => Person.parse(bad)).toThrow();
  });

  test("model-capabilities with an unknown engine is rejected", () => {
    const bad = { ...(loadFixture("model-capabilities.chat.example.json") as Record<string, unknown>), engine: "unknown-engine" };
    expect(() => ModelCapabilities.parse(bad)).toThrow();
  });

  test("model-capabilities footprint without hardware is rejected", () => {
    expect(() => ModelCapabilities.parse(loadFixture("model-capabilities.invalid-footprint-no-hardware.json"))).toThrow();
  });

  test("model-capabilities footprint with unknown KV cache type is rejected", () => {
    expect(() => ModelCapabilities.parse(loadFixture("model-capabilities.invalid-footprint-kv-cache-type.json"))).toThrow();
  });
});


describe("robot hello setting fixture", () => {
  test("settings-key.robot-hello.example.json", () => {
    expect(() => SettingsKey.parse(loadFixture("settings-key.robot-hello.example.json"))).not.toThrow();
  });
});


test("robot-self-test-result accepts valid answers and rejects invalid ones", () => {
  expect(() => RobotSelfTestResult.parse(loadFixture("robot-self-test-result.example.json"))).not.toThrow();
  expect(() => RobotSelfTestResult.parse(loadFixture("robot-self-test-result.invalid-detail.example.json"))).toThrow();
  expect(() => RobotSelfTestResult.parse(loadFixture("robot-self-test-result.missing-ok.invalid.example.json"))).toThrow();
});

describe("page-context and ambient quick actions", () => {
  test("page-context example is valid", () => {
    expect(() => PageContext.parse(loadFixture("page-context.example.json"))).not.toThrow();
  });

  test("page-context rejects an unknown key fixture", () => {
    expect(() => PageContext.parse(loadFixture("page-context.unknown-key.invalid.example.json"))).toThrow();
  });

  test("page-context enforces required and bounded fields", () => {
    const base = { app_id: "media", route: "/media" };
    expect(() => PageContext.parse({ ...base, record_id: "123" })).toThrow();
    expect(() => PageContext.parse({ ...base, route: "media" })).toThrow();
    expect(() => PageContext.parse({ ...base, app_id: "" })).toThrow();
    expect(() => PageContext.parse({ ...base, title: "x".repeat(201) })).toThrow();
  });

  test("quick-action exposes the three pane action ids", () => {
    expect(["help_with_page", "find_something", "take_action"].map((id) => QuickAction.parse(id))).toEqual([
      "help_with_page",
      "find_something",
      "take_action",
    ]);
    expect(() => QuickAction.parse("unknown")).toThrow();
  });
});
