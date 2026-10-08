// session-d-packages-and-store.md step 2: proves the new manifest fields
// (cache, warm, warm_on, contributes.widgets, exposes.queries, channel,
// smoke) round-trip through the generated Zod model with the real shapes
// the plan and wave-2.md's contracts describe. No bundled package uses
// these yet (cache/warm land in step 3, widgets in step 9, exposes.queries
// is C's to populate), so this is the only place proving the schema itself
// is right until then.
import { describe, expect, test } from "bun:test";
import { PackageManifest } from "../../gen/ts/manifest.js";

const BASE = {
  id: "test-pkg",
  version: "0.1.0",
  kind: "plugin",
  category: "Info",
  display: "Test",
  description: "A minimal manifest for schema field tests.",
  author: "MaiPai",
  license: "AGPL-3.0",
  platforms: ["home"],
  min_role: "child",
  consequential: false,
  offline: "full",
  min_app: "0.1.0",
  tier: 0,
  incognito: "unaffected",
} as const;

describe("PackageManifest, step 2's new fields", () => {
  test("cache: key_template, ttl_s, stale_ok_s, max_bytes", () => {
    const manifest = {
      ...BASE,
      cache: {
        key_template: "weather:{place}",
        ttl_s: 1800,
        stale_ok_s: 3600,
        max_bytes: 4096,
      },
    };
    expect(() => PackageManifest.parse(manifest)).not.toThrow();
  });

  test("warm: schedule, keys", () => {
    const manifest = {
      ...BASE,
      warm: {
        schedule: "every:1h",
        keys: [{ place: "household's home place" }],
      },
    };
    expect(() => PackageManifest.parse(manifest)).not.toThrow();
  });

  test("warm.schedule rejects a grammar the scheduler doesn't understand", () => {
    const manifest = { ...BASE, warm: { schedule: "hourly", keys: [] } };
    expect(() => PackageManifest.parse(manifest)).toThrow();
  });

  test("warm_on: setting keys that trigger an immediate warm", () => {
    const manifest = { ...BASE, warm_on: ["household.home"] };
    expect(() => PackageManifest.parse(manifest)).not.toThrow();
  });

  test("contributes.widgets: id, title, size, refresh_s, inputs", () => {
    const manifest = {
      ...BASE,
      contributes: {
        widgets: [
          {
            id: "forecast",
            title: "Weather",
            size: "card",
            refresh_s: 1800,
            inputs: { place: "home" },
          },
        ],
      },
    };
    expect(() => PackageManifest.parse(manifest)).not.toThrow();
  });

  test("contributes.widgets rejects a size outside card/row", () => {
    const manifest = {
      ...BASE,
      contributes: {
        widgets: [
          { id: "forecast", title: "Weather", size: "banner", refresh_s: 1800 },
        ],
      },
    };
    expect(() => PackageManifest.parse(manifest)).toThrow();
  });

  test("exposes.queries: id, description, args, returns", () => {
    const manifest = {
      ...BASE,
      exposes: {
        queries: [
          {
            id: "current_temperature",
            description: "The current temperature at a named place.",
            args: {
              type: "object",
              required: ["place"],
              properties: { place: { type: "string" } },
            },
            returns: {
              type: "object",
              properties: { temperature_f: { type: "number" } },
            },
          },
        ],
      },
    };
    expect(() => PackageManifest.parse(manifest)).not.toThrow();
  });

  test("channel defaults to stable and rejects an unknown value", () => {
    expect(PackageManifest.parse({ ...BASE, channel: "beta" }).channel).toBe(
      "beta",
    );
    expect(() =>
      PackageManifest.parse({ ...BASE, channel: "nightly" }),
    ).toThrow();
  });

  test("smoke.kind is required once smoke is present", () => {
    expect(() => PackageManifest.parse({ ...BASE, smoke: {} })).toThrow();
    expect(() =>
      PackageManifest.parse({ ...BASE, smoke: { kind: "static" } }),
    ).not.toThrow();
    expect(() =>
      PackageManifest.parse({
        ...BASE,
        smoke: { kind: "recipe_fixture", fixture: "tests/smoke.json" },
      }),
    ).not.toThrow();
  });

  test("routing.answers: empty array (a fixed-answer package that answers no entity kind)", () => {
    expect(
      PackageManifest.parse({ ...BASE, routing: { answers: [] } }).routing
        ?.answers,
    ).toEqual([]);
  });

  test("routing.answers: a declared list of entity kinds", () => {
    expect(
      PackageManifest.parse({
        ...BASE,
        routing: {
          answers: [
            "weekday",
            "relative_date",
            "clock_time",
            "number",
            "proper_noun",
          ],
        },
      }).routing?.answers,
    ).toEqual([
      "weekday",
      "relative_date",
      "clock_time",
      "number",
      "proper_noun",
    ]);
  });

  test("routing.answers: a partial list", () => {
    expect(
      PackageManifest.parse({ ...BASE, routing: { answers: ["clock_time"] } })
        .routing?.answers,
    ).toEqual(["clock_time"]);
  });

  test("routing.answers rejects a kind outside the vocabulary", () => {
    expect(() =>
      PackageManifest.parse({ ...BASE, routing: { answers: ["movie"] } }),
    ).toThrow();
  });

  test("tool_label: the package-declared tool_call label (TOOL-EVENTS-01)", () => {
    expect(
      PackageManifest.parse({
        ...BASE,
        tool_label: "Checking the weather in {place}",
      }).tool_label,
    ).toBe("Checking the weather in {place}");
    expect(PackageManifest.parse(BASE).tool_label).toBeUndefined();
    expect(() => PackageManifest.parse({ ...BASE, tool_label: "" })).toThrow();
  });

  test("offer: measured base and conditional decisions, plus reasoned off decisions (TOOL-OFFER-01)", () => {
    expect(
      PackageManifest.parse({ ...BASE, offer: { mode: "base", priority: 2 } })
        .offer?.mode,
    ).toBe("base");
    expect(
      PackageManifest.parse({
        ...BASE,
        offer: {
          mode: "conditional",
          gate: "answerImagesAllowed",
          bench_row: "answer-images",
        },
      }).offer?.mode,
    ).toBe("conditional");
    expect(
      PackageManifest.parse({
        ...BASE,
        offer: { mode: "off", reason: "measured recall below bar" },
      }).offer?.mode,
    ).toBe("off");
    expect(PackageManifest.parse(BASE).offer).toBeUndefined();
  });

  test("offer rejects unknown modes and undeclared fields", () => {
    expect(() =>
      PackageManifest.parse({ ...BASE, offer: { mode: "unmeasured" } }),
    ).toThrow();
    expect(() =>
      PackageManifest.parse({ ...BASE, offer: { mode: "base", extra: true } }),
    ).toThrow();
  });
});

describe("PackageManifest.incognito (INCOGNITO-04)", () => {
  test("required - a manifest that omits it fails validation, never gets a silent default", () => {
    const { incognito, ...withoutIncognito } = BASE;
    expect(() => PackageManifest.parse(withoutIncognito)).toThrow();
  });

  test("accepts each of the three declared values", () => {
    for (const value of ["blocked", "ephemeral", "unaffected"] as const) {
      expect(
        PackageManifest.parse({ ...BASE, incognito: value }).incognito,
      ).toBe(value);
    }
  });

  test("rejects a value outside the vocabulary", () => {
    expect(() =>
      PackageManifest.parse({ ...BASE, incognito: "hidden" }),
    ).toThrow();
  });
});

describe("PackageManifest.companion.status_phrases (STATUS-PHRASES-01)", () => {
  const COMPANION_BASE = {
    ...BASE,
    kind: "companion",
    companion: {
      display_name: "Test Companion",
      formality: "neutral",
      complexity: "standard",
      engagement: "balanced",
      filler_density: "light",
    },
  } as const;

  test("a companion may declare one moment and leave the others out", () => {
    const manifest = {
      ...COMPANION_BASE,
      companion: {
        ...COMPANION_BASE.companion,
        status_phrases: { searching: ["Hunting around…"] },
      },
    };
    const parsed = PackageManifest.parse(manifest);
    expect(parsed.companion?.status_phrases?.searching).toEqual([
      "Hunting around…",
    ]);
    expect(parsed.companion?.status_phrases?.thinking).toBeUndefined();
    expect(parsed.companion?.status_phrases?.checking).toBeUndefined();
  });

  test("a companion may declare all three moments", () => {
    const manifest = {
      ...COMPANION_BASE,
      companion: {
        ...COMPANION_BASE.companion,
        status_phrases: {
          thinking: ["Wondering…"],
          searching: ["Hunting around…"],
          checking: ["Squaring it up…"],
        },
      },
    };
    expect(() => PackageManifest.parse(manifest)).not.toThrow();
  });

  test("a companion with no status_phrases at all is fine - every moment falls back to vocab/status-phrases.json", () => {
    expect(
      PackageManifest.parse(COMPANION_BASE).companion?.status_phrases,
    ).toBeUndefined();
  });

  test("rejects a phrase that doesn't end in the single ellipsis character", () => {
    const manifest = {
      ...COMPANION_BASE,
      companion: {
        ...COMPANION_BASE.companion,
        status_phrases: { thinking: ["Wondering..."] },
      },
    };
    expect(() => PackageManifest.parse(manifest)).toThrow();
  });

  test("rejects a phrase past the length cap", () => {
    const manifest = {
      ...COMPANION_BASE,
      companion: {
        ...COMPANION_BASE.companion,
        status_phrases: { thinking: [`${"a".repeat(40)}…`] },
      },
    };
    expect(() => PackageManifest.parse(manifest)).toThrow();
  });

  test("rejects an empty phrase list for a declared moment", () => {
    const manifest = {
      ...COMPANION_BASE,
      companion: {
        ...COMPANION_BASE.companion,
        status_phrases: { thinking: [] },
      },
    };
    expect(() => PackageManifest.parse(manifest)).toThrow();
  });
});

describe("PackageManifest.companion.style_adapters (STYLE-SPEC-01)", () => {
  const COMPANION_BASE = {
    ...BASE,
    kind: "companion",
    companion: {
      display_name: "Example",
      formality: "neutral",
      complexity: "standard",
      engagement: "balanced",
      filler_density: "light",
    },
  } as const;
  const ENTRY = {
    base_model: "qwen3-8b-instruct-q4-k-m",
    format: "gguf-lora",
    url: "https://example.invalid/adapters/example.gguf",
    sha256: "a".repeat(64),
    approx_bytes: 41943040,
    corpus_sha256: "b".repeat(64),
  } as const;

  test("a manifest with a well-formed style_adapters entry validates", () => {
    expect(() =>
      PackageManifest.parse({
        ...COMPANION_BASE,
        companion: { ...COMPANION_BASE.companion, style_adapters: [ENTRY] },
      }),
    ).not.toThrow();
  });

  test('an entry missing sha256, or with format: "peft" instead of "gguf-lora", is refused and the validator names the wrong field', () => {
    const { sha256: _sha256, ...missingChecksum } = ENTRY;
    const missing = PackageManifest.safeParse({
      ...COMPANION_BASE,
      companion: {
        ...COMPANION_BASE.companion,
        style_adapters: [missingChecksum],
      },
    });
    expect(missing.success).toBe(false);
    if (!missing.success)
      expect(
        missing.error.issues.map((issue) => issue.path.join(".")),
      ).toContain("companion.style_adapters.0.sha256");

    const invalid = PackageManifest.safeParse({
      ...COMPANION_BASE,
      companion: {
        ...COMPANION_BASE.companion,
        style_adapters: [{ ...ENTRY, format: "peft" }],
      },
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success)
      expect(
        invalid.error.issues.map((issue) => issue.path.join(".")),
      ).toContain("companion.style_adapters.0.format");
  });
});
