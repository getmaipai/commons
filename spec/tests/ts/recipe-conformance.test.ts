// The recipe conformance suite (platform plan 3.2): every fixture in
// spec/fixtures/recipes/ must produce the same result from this
// interpreter as from the Python one (tests/py/test_recipe_conformance.py).
// This is the TS half of that proof.
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Recipe } from "../../gen/ts/recipe.js";
import { HostEmulator, HostError, type ArtifactRecordLike } from "../../emulators/ts/host-emulator.js";
import { runRecipe } from "../../interpreters/ts/recipe-interpreter.js";

const FIXTURES_DIR = join(import.meta.dir, "..", "..", "fixtures", "recipes");

interface ConformanceFixture {
  description: string;
  recipe: unknown;
  inputs: Record<string, unknown>;
  host_setup: {
    fetch?: Record<string, unknown>;
    config?: Record<string, unknown>;
    memory?: { text: string; category?: string; scope?: string; person?: string }[];
    shopping_list?: { text: string; done?: boolean }[];
    artifacts?: ArtifactRecordLike[];
  };
  expected?: {
    reply: { text: string; speech?: string } | null;
    actions: { kind: string; payload?: unknown }[];
    scheduled_jobs: { when: string; job: string; inputs?: Record<string, unknown> }[];
    home_calls: { domain: string; service: string; target: unknown; data: unknown }[];
    memory_added: { text: string; category?: string; scope?: string }[];
    ask?: { prompt: string; expects?: string } | null;
    data?: unknown;
    synthesis_hint?: string;
  };
  /** A fixture proving a host method throws (host.artifact.update's own
   * not_found/invalid_input) - mutually exclusive with `expected`: the
   * run is expected to reject rather than produce a result. */
  expected_error?: { code: string };
}

const fixtureFiles = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));

describe("recipe conformance", () => {
  for (const file of fixtureFiles) {
    test(file, async () => {
      const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, file), "utf-8")) as ConformanceFixture;
      const recipe = Recipe.parse(fixture.recipe);

      const host = new HostEmulator();
      for (const [url, body] of Object.entries(fixture.host_setup.fetch ?? {})) {
        host.setFetchResponse(url, body);
      }
      for (const [key, value] of Object.entries(fixture.host_setup.config ?? {})) {
        host.seedConfig(key, value);
      }
      if (fixture.host_setup.memory) {
        host.seedMemory(fixture.host_setup.memory);
      }
      if (fixture.host_setup.shopping_list) {
        host.seedShoppingList(fixture.host_setup.shopping_list);
      }
      if (fixture.host_setup.artifacts) {
        host.seedArtifacts(fixture.host_setup.artifacts);
      }

      if (fixture.expected_error) {
        let caught: unknown;
        try {
          await runRecipe(recipe, fixture.inputs, host);
        } catch (err) {
          caught = err;
        }
        expect(caught).toBeInstanceOf(HostError);
        expect((caught as HostError).code).toBe(fixture.expected_error.code);
        return;
      }

      const result = await runRecipe(recipe, fixture.inputs, host);
      const expected = fixture.expected!;

      expect(result.reply ?? null).toEqual(expected.reply);
      expect(result.actions).toEqual(expected.actions);
      expect(result.ask ?? null).toEqual(expected.ask ?? null);
      // `data` (a format step's named fields) is compared whole when the
      // fixture expects it: a number has to arrive as a number.
      if (expected.data !== undefined) expect(result.data).toEqual(expected.data);
      // CHAT-16: a format step's hint reaches the result verbatim, or
      // not at all.
      expect(result.synthesis_hint).toEqual(expected.synthesis_hint);
      expect(host.scheduledJobs.map(({ when, job, inputs }) => ({ when, job, inputs }))).toEqual(
        expected.scheduled_jobs,
      );
      expect(host.homeCallsLog).toEqual(expected.home_calls);
      expect(
        host.memoryStore.map(({ text, category, scope }) => ({ text, category, scope })),
      ).toEqual(expected.memory_added);
    });
  }
});
