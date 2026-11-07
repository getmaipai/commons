// A household key whose only reader is gone is removed from the one definition, not left as a control that does nothing.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const keys = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "settings", "keys.json"), "utf8")) as { key: string }[];

test("chat.teen_gate_grain is gone: a teen's replies are always checked per sentence, so no setting chooses it", () => {
  expect(keys.some((k) => k.key === "chat.teen_gate_grain")).toBe(false);
});

// Retired keys (2026-11-07, AUDIT-DEAD-01): nothing reads them, but a stored value must stay readable and ignored, and a write must
// still succeed, so they stay in the registry in a parked group that no settings card draws.
import { SettingsKey } from "../../gen/ts/settings-key.js";

const areas = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "settings", "areas.json"), "utf8")) as { not_placed: { scope: string; group: string }[] };
type Entry = { key: string; scope: string; lives_in: string; selector: string; default: unknown; help?: string };
const entries = keys as unknown as Entry[];
const find = (k: string) => entries.find((e) => e.key === k)!;
const drawnGroups = (): Set<string> => {
  const out = new Set<string>();
  const walk = (n: unknown, inNotPlaced = false): void => {
    if (Array.isArray(n)) n.forEach((x) => walk(x, inNotPlaced));
    else if (n && typeof n === "object") {
      for (const [k, v] of Object.entries(n)) {
        if (k === "not_placed") continue;
        if (k === "group" && typeof v === "string") out.add(`${(n as { scope?: string }).scope}:${v}`);
        else walk(v, inNotPlaced);
      }
    }
  };
  walk(JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "settings", "areas.json"), "utf8")));
  return out;
};

const RETIRED = ["engines.stack.use_chat", "engines.stack.use_embeddings", "engines.stack.use_stt", "engines.stack.use_tts", "generation.people_prompts"];

test("retired keys stay registered, still parse, and still accept a stored value of their type", () => {
  for (const k of RETIRED) {
    const e = find(k);
    expect(e, k).toBeDefined();
    expect(() => SettingsKey.parse(e), k).not.toThrow();
    expect(e.selector, k).toBe("boolean");
    expect(typeof e.default, k).toBe("boolean");
    expect(e.help ?? "", k).toMatch(/^Retired\./);
  }
});

test("retired keys are parked, so no settings screen draws them", () => {
  const parked = new Set(areas.not_placed.map((n) => `${n.scope}:${n.group}`));
  const drawn = drawnGroups();
  for (const k of RETIRED) {
    const id = `${find(k).scope}:${find(k).lives_in}`;
    expect(parked.has(id), k).toBe(true);
    expect(drawn.has(id), k).toBe(false);
  }
});

test("robot.greetings.mode is NOT retired: the robot body reads it", () => {
  expect(find("robot.greetings.mode")).toBeDefined();
  expect(find("robot.greetings.mode").lives_in).not.toMatch(/retired/);
});

test("chat.search_assist help describes what it does today, with no 'not active yet' wording", () => {
  const help = find("chat.search_assist").help ?? "";
  expect(help.length).toBeGreaterThan(20);
  expect(help).not.toMatch(/not (active )?yet|for now|coming soon|isn't active|is not active/i);
});
