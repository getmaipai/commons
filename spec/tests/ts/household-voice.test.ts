import { describe, expect, test } from "bun:test";
import { HouseholdVoice } from "../../gen/ts/household-voice.js";

const base = { id: "voice-abc123def456", label: "Cutey", created_by: "person-abc123", bytes: 489678, created_at: "2026-10-20T20:00:00Z", hlc: "1760990400000:0:node01" };

describe("VOICES-03 HouseholdVoice", () => {
  test("a voice with no temperature and no pitch is valid (engine default, no shift)", () => {
    const parsed = HouseholdVoice.parse(base);
    expect(parsed.temperature).toBeUndefined();
    expect(parsed.pitch_semitones).toBeUndefined();
  });
  test("temperature 1.05 and pitch -1 are kept", () => {
    expect(HouseholdVoice.parse({ ...base, temperature: 1.05, pitch_semitones: -1 })).toMatchObject({ temperature: 1.05, pitch_semitones: -1 });
  });
  test.each([0.09, 2.01])("temperature %p is refused", (temperature) => {
    expect(HouseholdVoice.safeParse({ ...base, temperature }).success).toBe(false);
  });
  test.each([-12.5, 12.5])("pitch offset %p is refused", (pitch_semitones) => {
    expect(HouseholdVoice.safeParse({ ...base, pitch_semitones }).success).toBe(false);
  });
  test("the id is a plain token and the record has no consent block", () => {
    expect(HouseholdVoice.safeParse({ ...base, id: "http://x/y" }).success).toBe(false);
    expect(HouseholdVoice.safeParse({ ...base, consent: { attested: true } }).success).toBe(false);
  });
});
