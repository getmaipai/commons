// ROUTER-BUILD-01a: the two search-assist record shapes validate a sample
// and reject a missing field; the setting key is declared once with its default.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TurnLabel } from "../../gen/ts/turn-label.js";
import { SearchAssistWeights } from "../../gen/ts/search-assist-weights.js";

const FIXTURES = join(import.meta.dir, "..", "..", "fixtures", "records");
const load = (n: string) => JSON.parse(readFileSync(join(FIXTURES, n), "utf-8")) as Record<string, unknown>;

describe("TurnLabel", () => {
  test("the sample validates", () => {
    expect(() => TurnLabel.parse(load("turn-label.example.json"))).not.toThrow();
  });
  test("every required field is required", () => {
    const sample = load("turn-label.example.json");
    for (const field of Object.keys(sample)) {
      const { [field]: _gone, ...rest } = sample;
      expect(() => TurnLabel.parse(rest), field).toThrow();
    }
  });
  test("memory_worthy is not part of the label", () => {
    expect(() => TurnLabel.parse({ ...load("turn-label.example.json"), memory_worthy: true })).toThrow();
  });
});

describe("SearchAssistWeights", () => {
  test("the sample validates", () => {
    expect(() => SearchAssistWeights.parse(load("search-assist-weights.example.json"))).not.toThrow();
  });
  test("every required field is required", () => {
    const sample = load("search-assist-weights.example.json");
    for (const field of Object.keys(sample)) {
      const { [field]: _gone, ...rest } = sample;
      expect(() => SearchAssistWeights.parse(rest), field).toThrow();
    }
  });
  test("a missing embed identity field is rejected", () => {
    const sample = load("search-assist-weights.example.json") as { embed: Record<string, unknown> };
    const { prefix: _p, ...embed } = sample.embed;
    expect(() => SearchAssistWeights.parse({ ...sample, embed })).toThrow();
  });
});

describe("chat.search_assist key", () => {
  test("declared once: household, select, off/shadow/rescue, default shadow, advanced", () => {
    const keys = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "settings", "keys.json"), "utf-8")) as Record<string, unknown>[];
    const hits = keys.filter((k) => k.key === "chat.search_assist");
    expect(hits.length).toBe(1);
    expect(hits[0]).toMatchObject({ scope: "household", selector: "select", default: "shadow", level: "advanced", lives_in: "household.ai", honoured_by: ["home"] });
    expect((hits[0].range as { options: string[] }).options).toEqual(["off", "shadow", "rescue"]);
  });
});
