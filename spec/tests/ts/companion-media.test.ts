import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COMPANION_MEDIA, COMPANION_MEDIA_STATES } from "../../media/ts/companionMedia.js";
import { PackageManifest } from "../../gen/ts/manifest.js";

const SPEC = join(import.meta.dir, "..", "..");
const BASE = {
  id: "test-companion",
  version: "0.1.0",
  kind: "companion",
  category: "Info",
  display: "Test Companion",
  description: "A test companion.",
  author: "MaiPai",
  license: "AGPL-3.0",
  platforms: ["home"],
  min_role: "child",
  consequential: false,
  offline: "full",
  min_app: "0.1.0",
  tier: 0,
  incognito: "unaffected",
  companion: { display_name: "Pip", formality: "casual", complexity: "simple", engagement: "balanced", filler_density: "none" },
} as const;

const animation = {
  kind: "video",
  spec_version: 1,
  key: "#00FF00",
  sheet: { rest: "pip-rest.png", card: "pip-card.png" },
  states: {
    idle: { h264: "pip-idle.mp4", av1: "pip-idle-av1.mp4", still: "pip-idle.png", loop: true },
    thinking: { h264: "pip-thinking.mp4", still: "pip-thinking.png", loop: true },
    working: { h264: "pip-working.mp4", still: "pip-working.png", loop: true },
    speaking: { h264: "pip-speaking.mp4", still: "pip-speaking.png", loop: true },
    needs_you: { h264: "pip-needs-you.mp4", still: "pip-needs-you.png", loop: true },
  },
  provenance: { tool: "renderer", model_sha256: "a".repeat(64), prompt_hash: "b".repeat(64), seed: 42, approved_by: "admin", approved_at: "2026-10-21T12:00:00Z" },
} as const;

function manifestWithAnimation(changes: Record<string, unknown> = {}) {
  return {
    ...BASE,
    companion: {
      ...BASE.companion,
      look_prompt: "A small friendly blue robot with round ears.",
      status: "ready",
      review: { confirmed_by: "admin@example.test", confirmed_at: "2026-10-21T12:00:00Z" },
      animation,
      ...changes,
    },
  };
}

describe("CMEDIA-SPEC-01 companion media", () => {
  test("the full optional media declaration round-trips", () => {
    const parsed = PackageManifest.parse(manifestWithAnimation());
    expect(parsed.companion?.look_prompt).toBe("A small friendly blue robot with round ears.");
    expect(parsed.companion?.status).toBe("ready");
    expect(parsed.companion?.review?.confirmed_by).toBe("admin@example.test");
    expect(parsed.companion?.animation).toEqual(animation);
    expect(PackageManifest.parse(BASE).companion?.animation).toBeUndefined();
  });

  test("rejects invalid animation declarations", () => {
    const refused: Array<[string, Record<string, unknown>]> = [
      ["unknown state", { states: { ...animation.states, dancing: { h264: "dance.mp4", still: "dance.png", loop: true } } }],
      ["missing still", { states: { idle: { h264: "idle.mp4", loop: true } } }],
      ["slash path", { states: { idle: { h264: "clips/idle.mp4", still: "idle.png", loop: true } } }],
      ["dot dot path", { states: { idle: { h264: "idle..mp4", still: "idle.png", loop: true } } }],
      ["wrong kind", { kind: "gif" }],
      ["unknown status", { status: "done" }],
      ["invalid key", { key: "green" }],
      ["idle missing", { states: { thinking: { h264: "thinking.mp4", still: "thinking.png", loop: true } } }],
    ];
    for (const [label, change] of refused) {
      const companionChanges = "status" in change ? { status: change.status } : {};
      const animationChanges = Object.fromEntries(Object.entries(change).filter(([key]) => key !== "status"));
      expect(() => PackageManifest.parse(manifestWithAnimation({ ...companionChanges, animation: { ...animation, ...animationChanges } })), label).toThrow();
    }
  });

  test("a state may have only a still", () => {
    expect(() => PackageManifest.parse(manifestWithAnimation({ animation: { ...animation, states: { ...animation.states, idle: { still: "idle.png", loop: true } } } }))).not.toThrow();
  });

  test("the schema state list and required states track the vocabulary", () => {
    const schema = JSON.parse(readFileSync(join(SPEC, "schemas", "manifest.schema.json"), "utf8")) as {
      properties: {
        companion: {
          properties: {
            animation: {
              properties: { states: { required: string[]; properties: Record<string, unknown> } };
            };
          };
        };
      };
    };
    const stateSchema = schema.properties.companion.properties.animation.properties.states;
    expect(Object.keys(stateSchema.properties)).toEqual(COMPANION_MEDIA_STATES);
    expect(COMPANION_MEDIA.states.map((state) => state.id)).toEqual(COMPANION_MEDIA_STATES);
    expect(COMPANION_MEDIA.states.filter((state) => state.required).map((state) => state.id)).toEqual([
      "idle", "thinking", "working", "speaking", "needs_you",
    ]);
    expect(COMPANION_MEDIA.states.filter((state) => state.required)).toHaveLength(5);
    expect(stateSchema.required).toEqual(["idle"]);
  });

  test("the vocab numbers stay at the CMEDIA-SPEC-01 values", () => {
    expect(COMPANION_MEDIA).toMatchObject({
      version: 1,
      image: { size: 1024, margin_percent: 12, format: "png", min_upload_short_side: 512, max_upload_bytes: 20971520 },
      key: { default: "#00FF00", alternate: "#FF00FF" },
      generate: { width: 480, height: 480, fps: 24, frames: 73, seconds: 3 },
      ship: {
        colour_width: 480, colour_height: 480, stacked_width: 480, stacked_height: 960, fps: 24,
        loop_seconds: { min: 2, max: 4 }, oneshot_seconds: { min: 1.5, max: 4 },
        max_bytes_per_clip: 614400, max_bytes_per_character: 8388608,
        codecs: { required: "h264", optional: ["av1"] }, audio: false,
      },
      upload_video: { max_bytes: 31457280, max_seconds: 10, types: ["video/mp4", "video/quicktime", "video/webm"] },
    });
    expect((COMPANION_MEDIA.generate.frames - 1) % 4).toBe(0);
    expect(COMPANION_MEDIA.generate.frames).toBe(COMPANION_MEDIA.generate.fps * COMPANION_MEDIA.generate.seconds + 1);
    expect(COMPANION_MEDIA.generate.width).toBe(COMPANION_MEDIA.ship.colour_width);
    expect(COMPANION_MEDIA.generate.height).toBe(COMPANION_MEDIA.ship.colour_height);
    expect(COMPANION_MEDIA.generate.seconds).toBeLessThanOrEqual(Math.max(...COMPANION_MEDIA.states.map((state) => state.max_seconds)));
    expect(COMPANION_MEDIA.generate.seconds).toBeGreaterThanOrEqual(Math.min(...COMPANION_MEDIA.states.map((state) => state.min_seconds)));
    expect(COMPANION_MEDIA.states).toEqual([
      { id: "idle", kind: "loop", required: true, min_seconds: 3, max_seconds: 4, motion: "breathes slowly, tiny sway, one blink", driven_by: "outside a turn" },
      { id: "idle_look", kind: "oneshot", required: false, min_seconds: 2, max_seconds: 3, motion: "looks to one side, then back", driven_by: "random while idle" },
      { id: "listening", kind: "loop", required: false, min_seconds: 2, max_seconds: 3, motion: "head tilts slightly toward the viewer, attentive", driven_by: "the person is speaking to the robot" },
      { id: "thinking", kind: "loop", required: true, min_seconds: 2, max_seconds: 3, motion: "looks up and to the side, one paw to chin", driven_by: "a turn before the first word" },
      { id: "working", kind: "loop", required: true, min_seconds: 2, max_seconds: 4, motion: "busy, small repeated gesture, looking down at its hands", driven_by: "a tool, job or project is running" },
      { id: "speaking", kind: "loop", required: true, min_seconds: 2, max_seconds: 3, motion: "mouth opens and closes at a speaking rhythm, small head movement", driven_by: "the voice is playing" },
      { id: "needs_you", kind: "loop", required: true, min_seconds: 2, max_seconds: 3, motion: "leans forward, holds up one paw, hopeful", driven_by: "an approval waits for the person" },
      { id: "greeting", kind: "oneshot", required: false, min_seconds: 2, max_seconds: 3, motion: "waves once, smiles", driven_by: "first open of the day" },
      { id: "happy", kind: "oneshot", required: false, min_seconds: 2, max_seconds: 2, motion: "small hop, smile", driven_by: "a good result or a thank you" },
      { id: "oops", kind: "oneshot", required: false, min_seconds: 2, max_seconds: 2, motion: "rubs the back of its head, sheepish", driven_by: "an error the companion owns" },
      { id: "celebrate", kind: "oneshot", required: false, min_seconds: 2, max_seconds: 3, motion: "both arms up, bounce", driven_by: "a long job finished" },
      { id: "sleeping", kind: "loop", required: false, min_seconds: 3, max_seconds: 4, motion: "eyes closed, slow breathing", driven_by: "quiet hours or no activity" },
    ]);
  });
});
