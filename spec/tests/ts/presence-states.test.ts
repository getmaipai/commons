import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PresenceState } from "../../gen/ts/presence-state.js";
import { RobotState } from "../../gen/ts/robot-state.js";

const ROOT = join(import.meta.dir, "..", "..");
const read = <T>(path: string): T => JSON.parse(readFileSync(join(ROOT, path), "utf8")) as T;
const vocab = read<{
  priority: string[];
  timing: Record<string, number>;
  states: Array<{
    state: string;
    eyes: string;
    primitive: string;
    emotion_overlay: string | null;
    child_state: string;
    child_band: string;
    motion: number;
    focus: number;
    alert: number;
    web: { orb: string; agent_status: string | null; caption: string | null; child_caption: string | null };
  }>;
  eyes_look_keys: string[];
  activity_kinds: string[];
  owner_id_rules: Record<string, string>;
  activity_policy: { stale_expiry: { after_ms: number; kinds: string[]; never_expire: string[] }; durable_reconcile: { every_ms: number; sources: string[] } };
  dial_tokens: Record<string, string>;
  turn_stream_events: Array<{ event: string; presence: string | null; condition?: string }>;
}>("vocab/presence-states.json");
const emotions = read<{ labels: Array<{ label: string; child_band: string }> }>("vocab/emotion-map.json");
const primitives = new Set(read<{ primitives: string[] }>("fixtures/moves/primitive-names.example.json").primitives);
const states = new Set(vocab.states.map((row) => row.state));

describe("PRESENCE-STATES-01", () => {
  test("each closed state has an Eyes look, body primitive, web form, and generated type", () => {
    const eyes = new Set(vocab.eyes_look_keys);
    const emotionLabels = new Map(emotions.labels.map((label) => [label.label, label.child_band]));
    const childBands = new Set(emotions.labels.map((label) => label.child_band));
    expect(vocab.states.map((row) => row.state)).toEqual([
      "idle", "present", "listening", "thinking", "working", "speaking", "asking", "done", "concerned", "sleeping", "offline",
    ]);
    for (const row of vocab.states) {
      expect(PresenceState.parse(row.state)).toBe(row.state);
      expect(eyes.has(row.eyes), `${row.state} has no Eyes look`).toBe(true);
      expect(primitives.has(row.primitive), `${row.state} has no robot primitive`).toBe(true);
      expect(["idle", "listening", "connecting", "speaking", "muted"]).toContain(row.web.orb);
      expect([null, "working", "waiting", "done", "failed"]).toContain(row.web.agent_status);
      expect(states.has(row.child_state)).toBe(true);
      expect(childBands.has(row.child_band)).toBe(true);
      if (row.emotion_overlay !== null) {
        expect(emotionLabels.has(row.emotion_overlay), `${row.state} adds an emotion`).toBe(true);
        expect(row.child_band).toBe(emotionLabels.get(row.emotion_overlay));
      }
      for (const dial of [row.motion, row.focus, row.alert]) expect(dial).toBeGreaterThanOrEqual(0);
      for (const dial of [row.motion, row.focus, row.alert]) expect(dial).toBeLessThanOrEqual(1);
    }
    expect(vocab.states.find((row) => row.state === "concerned")?.emotion_overlay).toBe("confused");
    expect(vocab.states.find((row) => row.state === "concerned")?.child_state).toBe("idle");
    expect(vocab.states.some((row) => row.child_state === "concerned")).toBe(false);
    expect(vocab.states.find((row) => row.state === "asking")?.web.child_caption).toBe("Asked a parent");
  });

  test("resolver timing, priority and private activity ownership are explicit", () => {
    expect(vocab.priority).toEqual(["offline", "sleeping", "asking", "listening", "speaking", "working", "thinking", "done", "present", "idle"]);
    expect(vocab.timing).toEqual({ idle_grace_ms: 2000, stale_expiry_ms: 120000, durable_reconcile_ms: 5000 });
    expect(vocab.activity_policy.stale_expiry).toEqual({ after_ms: 120000, kinds: ["turn", "tool", "voice"], action: "drop stale activity and log it", never_expire: ["ask"] });
    expect(vocab.activity_policy.durable_reconcile.every_ms).toBe(5000);
    expect(vocab.dial_tokens).toEqual({ motion: "--presence-motion", focus: "--presence-focus", alert: "--presence-alert" });
    expect(new Set(vocab.activity_kinds)).toEqual(new Set(Object.keys(vocab.owner_id_rules)));
    expect(Object.values(vocab.owner_id_rules).every((rule) => rule.length > 0)).toBe(true);
  });

  test("every Row-Bot event fixture maps to a closed state without carrying identity or reasons", () => {
    const paths = readdirSync(join(ROOT, "fixtures/presence")).filter((path) => path.startsWith("row-bot-") && path.endsWith(".json"));
    expect(paths).toHaveLength(25);
    const rows = paths.map((path) => read<{ source: string; event: string; presence: string; emotion_overlay: string | null }>(`fixtures/presence/${path}`));
    expect(new Set(rows.map((row) => row.event)).size).toBe(25);
    for (const row of rows) {
      expect(row.source).toBe("Row-Bot _EVENT_REACTIONS");
      expect(states.has(row.presence)).toBe(true);
      PresenceState.parse(row.presence);
      for (const privateField of ["owner_id", "person_id", "reason", "outcome", "refusal_reason"]) {
        expect(row).not.toHaveProperty(privateField);
      }
      if (row.emotion_overlay !== null) expect(emotions.labels.some((label) => label.label === row.emotion_overlay)).toBe(true);
    }
  });

  test("turn-stream event fixtures agree with the event mapping and the additive frame field", () => {
    const paths = readdirSync(join(ROOT, "fixtures/presence")).filter((path) => path.startsWith("turn-stream-") && path.endsWith(".json"));
    expect(paths.length).toBe(vocab.turn_stream_events.length);
    for (const path of paths) {
      const row = read<{ event: string; presence: string | null; condition?: string }>(`fixtures/presence/${path}`);
      expect(vocab.turn_stream_events.some((entry) => entry.event === row.event && entry.presence === row.presence && entry.condition === row.condition)).toBe(true);
      if (row.presence !== null) PresenceState.parse(row.presence);
    }
    const robot = read<Record<string, unknown>>("fixtures/records/robot-state.presence.example.json");
    expect(RobotState.parse(robot).presence).toBe("idle");
    const legacy = read<Record<string, unknown>>("fixtures/records/robot-state.idle.example.json");
    expect(RobotState.parse(legacy).presence).toBeUndefined();
  });
});
