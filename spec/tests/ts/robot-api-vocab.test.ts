import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const VOCAB_DIR = join(import.meta.dir, "..", "..", "vocab");
const load = <T>(name: string): T => JSON.parse(readFileSync(join(VOCAB_DIR, name), "utf-8")) as T;

interface RobotApi {
  whole_robot_verbs: string[];
  parts: Array<{ id: string; capabilities: string[]; capability_mode?: "any"; verbs: string[] }>;
  errors: Array<{
    id: string;
    shape: {
      required: string[];
      properties: Record<string, { type: string; description: string }>;
      additionalProperties: boolean;
    };
  }>;
}

interface Capabilities {
  capabilities: string[];
}

describe("vocab/robot-api.json", () => {
  const api = load<RobotApi>("robot-api.json");
  const capabilities = new Set(load<Capabilities>("capabilities.json").capabilities);

  test("declares each robot API part once and every capability reference exists", () => {
    const partIds = api.parts.map((part) => part.id);
    expect(new Set(partIds).size).toBe(partIds.length);
    for (const part of api.parts) {
      expect(part.capabilities.length, `${part.id} needs a capability`).toBeGreaterThan(0);
      for (const capability of part.capabilities) {
        expect(capabilities.has(capability), `${part.id} references unknown capability ${capability}`).toBe(true);
      }
      const qualifiedVerbs = part.verbs.map((verb) => `${part.id}.${verb}`);
      expect(new Set(qualifiedVerbs).size, `${part.id} repeats a verb`).toBe(qualifiedVerbs.length);
    }
  });

  test("covers the shared robot object parts and lifecycle verbs", () => {
    expect(new Set(api.parts.map((part) => part.id))).toEqual(new Set([
      "connection", "power", "estop", "lease", "head", "appendages", "base", "posture", "dock",
      "battery", "health", "pose", "eyes", "leds", "display", "audio", "camera", "imu", "touch",
      "proximity", "network", "system", "log", "diagnostics", "state",
    ]));
    expect(api.whole_robot_verbs).toEqual([
      "connect", "disconnect", "wake", "sleep", "power_on", "shutdown", "emergency_stop",
    ]);
  });

  test("declares an actionable NotSupported error shape", () => {
    const error = api.errors.find((item) => item.id === "NotSupported");
    expect(error).toBeDefined();
    expect(error!.shape.required).toEqual(["part", "capability", "message", "fix"]);
    expect(Object.keys(error!.shape.properties).sort()).toEqual([...error!.shape.required].sort());
    expect(error!.shape.additionalProperties).toBe(false);
    for (const field of Object.values(error!.shape.properties)) {
      expect(field.type).toBe("string");
      expect(field.description.length).toBeGreaterThan(0);
    }
  });
});
