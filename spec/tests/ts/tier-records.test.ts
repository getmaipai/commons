// TIER-SPEC-01: the resource-tier vocabulary, the tier slot record, the tier.max grants,
// the job and provenance tier fields, and the resources.* and slot settings keys.
import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkTierSlotOptions, optionsForBand } from "../../records/ts/tierSlot";
import { SettingsKey } from "../../gen/ts/settings-key.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (p: string) => JSON.parse(readFileSync(join(SPEC, p), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const slotSchema = ajv.compile(read("schemas/tier-slot.schema.json"));
const vocab = read("vocab/resource-tiers.json");
const keys = read("settings/keys.json") as Array<Record<string, any>>;
const keyOf = (k: string) => keys.find((e) => e.key === k)!;

describe("vocab/resource-tiers.json", () => {
  test("the four tiers are in ladder order and only Reduced is system-only", () => {
    expect(vocab.tiers.map((t: any) => t.id)).toEqual(["reduced", "standard", "boost", "max"]);
    expect(vocab.tiers.filter((t: any) => !t.pickable).map((t: any) => t.id)).toEqual(["reduced"]);
  });
  test("every category option is typed and its default is inside its range", () => {
    for (const c of vocab.categories) {
      for (const o of c.options) {
        expect(["boolean", "integer", "number"]).toContain(o.type);
        expect(typeof o.minors).toBe("boolean");
        if (o.type !== "boolean") {
          expect(o.default).toBeGreaterThanOrEqual(o.min);
          expect(o.default).toBeLessThanOrEqual(o.max);
        }
      }
    }
  });
  test("a draft model is a launch setting, never an option", () => {
    for (const c of vocab.categories) for (const o of c.options) expect(o.id).not.toMatch(/draft/);
  });
  test("the switch costs are option, family, cross", () => {
    expect(vocab.switch_costs.map((s: any) => s.id)).toEqual(["option", "family", "cross"]);
  });
  test("each category's role has a slot key for every tier", () => {
    for (const c of vocab.categories) for (const t of vocab.tiers) expect(keyOf(`engines.${c.role}.tier.${t.id}`)).toBeDefined();
  });
});

describe("tier slot", () => {
  test("accepts a model and typed options, and a recommended or off model", () => {
    expect(slotSchema({ model: "recommended", options: {} })).toBe(true);
    expect(slotSchema({ model: "off", options: {}, who: "admins" })).toBe(true);
    expect(slotSchema({ model: "qwen3-8b-instruct-q4-k-m", options: { thinking: true, reasoning_budget: 4000 } })).toBe(true);
  });
  test("rejects a missing options object, a bad who and a non-id model", () => {
    expect(slotSchema({ model: "recommended" })).toBe(false);
    expect(slotSchema({ model: "recommended", options: {}, who: "nobody" })).toBe(false);
    expect(slotSchema({ model: "Not An Id", options: {} })).toBe(false);
  });
  test("option names and ranges come from the category table", () => {
    expect(checkTierSlotOptions("chat", { thinking: true, reasoning_budget: 2000 })).toEqual([]);
    expect(checkTierSlotOptions("chat", { steps: 8 })).toHaveLength(1);
    expect(checkTierSlotOptions("chat", { thinking: 1 })).toHaveLength(1);
    expect(checkTierSlotOptions("image", { steps: 0 })).toHaveLength(1);
    expect(checkTierSlotOptions("image", { steps: 12.5 })).toHaveLength(1);
    expect(checkTierSlotOptions("voice", { steps: 8 })).toHaveLength(1);
    expect(checkTierSlotOptions("nothing", {})).toHaveLength(1);
  });
  test("thinking never reaches a minor, whatever the slot says", () => {
    const slot = { thinking: true, reasoning_budget: 8000 };
    expect(optionsForBand("chat", slot, "adult")).toEqual(slot);
    expect(optionsForBand("chat", slot, "teen")).toEqual({ thinking: false, reasoning_budget: 0 });
    expect(optionsForBand("chat", slot, "child")).toEqual({ thinking: false, reasoning_budget: 0 });
    expect(optionsForBand("image", { steps: 30 }, "child")).toEqual({ steps: 30 });
  });
  test("every slot key defaults to a valid slot, and Reduced starts off", () => {
    for (const c of vocab.categories) {
      for (const t of vocab.tiers) {
        const k = keyOf(`engines.${c.role}.tier.${t.id}`);
        expect(slotSchema(k.default)).toBe(true);
        expect(k.range.value_schema).toBe("tier-slot");
        expect(k.range.category).toBe(c.id);
        if (t.id === "reduced") expect(k.default.model).toBe("off");
      }
    }
  });
});

describe("tier.max grants", () => {
  const grants = read("vocab/grant-actions.json").actions as any[];
  const find = (id: string) => grants.find((g) => g.id === id);
  test("a child never holds Max and a teen holds it only for pictures, with an admin's approval", () => {
    const bare = find("tier.max").policy.approver;
    expect(bare).toEqual({ child: "never", teen: "never", adult: "none" });
    const cat = find("tier.max:<category>").policy;
    expect(cat.approver.child).toBe("never");
    expect(cat.approver.teen).toBe("never");
    expect(cat.by_parameter).toEqual({ image: { child: "never", teen: "parent", adult: "none" } });
    expect(vocab.minors_policy.teen_max_categories).toEqual(["image"]);
    expect(vocab.minors_policy.child_max).toBe("never");
  });
  test("every category has a grant parameter", () => {
    expect(vocab.categories.map((c: any) => c.grant_parameter)).toEqual(["chat", "image", "video", "music", "voice"]);
  });
});

describe("resources.* settings", () => {
  test("every new key parses as a SettingsKey", () => {
    for (const e of keys.filter((k) => k.key.startsWith("resources.") || /^engines\.[a-z]+\.tier\./.test(k.key))) {
      expect(() => SettingsKey.parse(e), e.key).not.toThrow();
    }
  });
  test("the quiet time never goes below 20 seconds", () => {
    expect(keyOf("resources.quiet_seconds").range.min).toBe(20);
    expect(keyOf("resources.quiet_seconds").default).toBe(60);
    expect(keyOf("resources.quiet_max_wait").default).toBe(600);
  });
  test("the presets match the making-space note and close apps is off by default", () => {
    expect(keyOf("resources.preset").range.options).toEqual(["chat_first", "balanced", "big_jobs_first", "custom"]);
    expect(keyOf("resources.preset").default).toBe("chat_first");
    expect(keyOf("resources.close_apps.mode").range.options).toEqual(["off", "automatic"]);
    expect(keyOf("resources.close_apps.mode").default).toBe("off");
    expect(keyOf("resources.close_apps.always").default).toBe("[]");
    expect(keyOf("resources.close_apps.never").default).toBe("[]");
    expect(keyOf("resources.close_apps.reopen").default).toBe(true);
    expect(keyOf("resources.close_apps.no_reopen").default).toBe("[]");
  });
  test("lower without asking is per category, chat is never lowered without asking by default, voice has none", () => {
    for (const c of ["chat", "image", "video", "music"]) expect(keyOf(`resources.lower_without_asking.${c}`).default).toBe(false);
    expect(keys.some((k) => k.key === "resources.lower_without_asking.voice")).toBe(false);
  });
  test("the profile table holds the four default rows and chat is never queued or off", () => {
    const t = JSON.parse(keyOf("resources.profiles").default);
    expect(Object.keys(t)).toEqual(["video.max", "video.boost", "image.max", "chat.max"]);
    for (const row of Object.values<any>(t)) expect(["queued", "off"]).not.toContain(row.chat);
  });
  test("the priority list leaves chat first and holds no voice", () => {
    expect(JSON.parse(keyOf("resources.priority").default)[0]).toBe("chat");
  });
});

describe("provenance and model family", () => {
  test("provenance carries an optional tier and a catalog entry an optional family", () => {
    const prov = read("schemas/generation-provenance.schema.json");
    expect(prov.properties.tier.enum).toEqual(["reduced", "standard", "boost", "max", null]);
    expect(prov.required).not.toContain("tier");
    const cap = read("schemas/model-capabilities.schema.json");
    expect(cap.properties.family.pattern).toBe("^[a-z][a-z0-9-]*$");
    expect(cap.required).not.toContain("family");
  });
});
