import { describe, expect, test } from "bun:test";
import { SceneObservation } from "../../gen/ts/scene-observation.js";
import { Scene } from "../../gen/ts/scene.js";

const source = { surface: "robot", device_id: null, sensor: "face" };
const person = { person_id: "person-abcdef", label: null, relation: "household", band: "adult", level: "confirmed" };
const values: Record<string, unknown> = {
  person_here: person, person_left: person,
  place: { where: "home", setting: "indoor", area: null, precision: "area" },
  room: { room: "kitchen" }, people_count: 2, light: { bucket: "bright" },
  sound_event: { class: "doorbell", score: 0.8 }, temperature: { bucket: "cool" },
  motion: { state: "still", pose: "upright" }, door: { bucket: "open" },
  weather: { bucket: "rain" }, weather_alert: { bucket: "severe" },
};
const observation = (kind: string, value: unknown) => ({ id: "obs-1", source, kind, value, confidence: 0.8, strength: "strong", at: 1, expires_at: 2 });

describe("SCENE-01a", () => {
  test("accepts each observation kind and rejects a wrong value shape for each", () => {
    for (const [kind, value] of Object.entries(values)) {
      expect(SceneObservation.safeParse(observation(kind, value)).success, kind).toBe(true);
      expect(SceneObservation.safeParse(observation(kind, {})).success, kind).toBe(false);
    }
  });
  test("rejects unknown kinds, invalid confidence and bad person ids", () => {
    expect(SceneObservation.safeParse(observation("unknown", 1)).success).toBe(false);
    expect(SceneObservation.safeParse({ ...observation("people_count", 1), confidence: 1.1 }).success).toBe(false);
    expect(SceneObservation.safeParse(observation("person_here", { ...person, person_id: "bad" })).success).toBe(false);
  });
  test("maps bot present entries to valid person_here observations", () => {
    const present = [
      { person: "person-abcdef", basis: "face", level: "confirmed" },
      { person: null, basis: "voice", level: "tentative" },
    ];
    const mapPresent = (items: typeof present) => items.map((item, i) => observation("person_here", {
      person_id: item.person, label: null, relation: item.person ? "household" : "unknown",
      band: "unknown", level: item.level === "unknown" ? "tentative" : item.level,
    }));
    const result = mapPresent(present);
    expect(result).toHaveLength(present.length);
    for (const row of result) expect(SceneObservation.safeParse(row).success).toBe(true);
  });
  test("accepts a runtime scene and rejects unknown fields", () => {
    const row = { conversation_id: "conv-abcdef", people: [], speaker: null, place: null, ambient: null, weather: null, alone: true, child_present: false, updated_at: 1 };
    expect(Scene.safeParse(row).success).toBe(true);
    expect(Scene.safeParse({ ...row, stored: true }).success).toBe(false);
  });
});
