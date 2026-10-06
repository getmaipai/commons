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
import { Device } from "../../gen/ts/device.js";
import { RobotState } from "../../gen/ts/robot-state.js";
import { DeviceCommand } from "../../gen/ts/device-command.js";
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
  test("person.example.json", () => {
    expect(() => Person.parse(loadFixture("person.example.json"))).not.toThrow();
  });

  test("setting-value.example.json", () => {
    expect(() =>
      SettingValue.parse(loadFixture("setting-value.example.json")),
    ).not.toThrow();
  });

  test("settings-key.example.json", () => {
    expect(() =>
      SettingsKey.parse(loadFixture("settings-key.example.json")),
    ).not.toThrow();
  });

  for (const kind of ["memory", "memory-legacy", "entity", "episode"]) {
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

  for (const kind of ["shopping", "todo", "custom"]) {
    test(`list.${kind}.example.json`, () => {
      expect(() => List.parse(loadFixture(`list.${kind}.example.json`))).not.toThrow();
    });
  }

  // Three relationship fixtures, one per case the two-axis design exists
  // for: a former job (valid_to set), an estranged daughter (valid_to
  // null, status estranged), and an unconfirmed inference.
  for (const kind of ["stated", "estranged", "inferred"]) {
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

  test("project.example.json", () => {
    expect(() => Project.parse(loadFixture("project.example.json"))).not.toThrow();
  });

  test("project.failed.example.json", () => {
    expect(() => Project.parse(loadFixture("project.failed.example.json"))).not.toThrow();
  });

  test("conversation.temporary.example.json", () => {
    expect(() => Conversation.parse(loadFixture("conversation.temporary.example.json"))).not.toThrow();
  });

  test("device.example.json", () => {
    expect(() => Device.parse(loadFixture("device.example.json"))).not.toThrow();
  });

  for (const kind of ["reachy-mini", "reachy-mini-eyes", "maipai-build"]) {
    test(`device.robot-${kind}.example.json`, () => {
      expect(() => Device.parse(loadFixture(`device.robot-${kind}.example.json`))).not.toThrow();
    });
  }

  for (const kind of ["starting", "idle", "listening", "thinking", "speaking", "reconnecting", "sleeping", "unknown-battery", "minimal", "held", "resting"]) {
    test(`robot-state.${kind}.example.json`, () => {
      expect(() => RobotState.parse(loadFixture(`robot-state.${kind}.example.json`))).not.toThrow();
    });
  }

  test("device-command fixtures cover every kind and reject a mismatched payload", () => {
    const commands = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "fixtures", "records", "device-command.kinds.example.json"), "utf-8")) as unknown[];
    expect(commands).toHaveLength(14);
    for (const command of commands) expect(() => DeviceCommand.parse(command)).not.toThrow();
    const invalid = { ...(commands[0] as object), kind: "capture_request" };
    expect(() => DeviceCommand.parse(invalid)).toThrow();
    const fixtures = join(import.meta.dir, "..", "..", "fixtures", "records");
    const waitingWithText = JSON.parse(readFileSync(join(fixtures, "device-command.notify-waiting-with-text.invalid.example.json"), "utf-8"));
    expect(() => DeviceCommand.parse(waitingWithText)).toThrow();
    const offer = (commands as { kind: string; payload: Record<string, unknown> }[]).find((command) => command.kind === "offer")!;
    expect(offer.payload).not.toHaveProperty("text");
    expect(() => DeviceCommand.parse({ ...offer, payload: { ...offer.payload, text: "prepared content" } })).toThrow();
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
    expect(pins).toHaveLength(6);
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

  for (const kind of ["chat", "image", "mlx-serve", "sherpa-onnx-node", "pocket-tts", "judge-role", "rerank-role", "music-role", "background-turns", "vision-role"]) {
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
