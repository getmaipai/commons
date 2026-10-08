// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/manifest.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One manifest format for every package kind (plugin, skill, app, companion, integration, model, wakeword, voice, theme, module). See platform plan 5.1 and .github's docs/PACKAGES.md.*/
export const PackageManifest = z
  .object({
    /**Unique in the catalog. No third-party name in it. Not one of the nine reserved settings area ids (the static legacy routes under /settings).*/
    id: z
      .string()
      .regex(new RegExp("^[a-z0-9][a-z0-9_-]{0,63}$"))
      .describe(
        "Unique in the catalog. No third-party name in it. Not one of the nine reserved settings area ids (the static legacy routes under /settings).",
      ),
    version: z.string().regex(new RegExp("^[0-9]+\\.[0-9]+\\.[0-9]+$")),
    /**A `plugin` is a self-contained, permissioned, installable capability (its own network access, its own recipe.json). A `skill` is plain instructions (a SKILL.md body, Claude-format-compatible) - no permissions, no recipe, composed into the chat model's system prompt when relevant, never runs on its own. See home/docs/dev.md's 'Naming: skill, plugin, command, connector' entry. A `reference` is a declarative offline knowledge archive (no code, like `model` and `voice`) - a Kiwix-style book a household installs and sizes before download; see `knowledge_source` below and home/docs/plans/knowledge-sources-2026-09-24.md. A `project` package declares a background project type: its body is `plan.json` (a `ProjectPlan`, this same file's own sibling `project.schema.json`'s `$defs/ProjectPlan`), never `recipe.json`.*/
    kind: z
      .enum([
        "plugin",
        "skill",
        "app",
        "companion",
        "integration",
        "model",
        "wakeword",
        "voice",
        "theme",
        "module",
        "reference",
        "project",
      ])
      .describe(
        "A `plugin` is a self-contained, permissioned, installable capability (its own network access, its own recipe.json). A `skill` is plain instructions (a SKILL.md body, Claude-format-compatible) - no permissions, no recipe, composed into the chat model's system prompt when relevant, never runs on its own. See home/docs/dev.md's 'Naming: skill, plugin, command, connector' entry. A `reference` is a declarative offline knowledge archive (no code, like `model` and `voice`) - a Kiwix-style book a household installs and sizes before download; see `knowledge_source` below and home/docs/plans/knowledge-sources-2026-09-24.md. A `project` package declares a background project type: its body is `plan.json` (a `ProjectPlan`, this same file's own sibling `project.schema.json`'s `$defs/ProjectPlan`), never `recipe.json`.",
      ),
    category: z.enum([
      "Home",
      "Family",
      "Info",
      "Fun",
      "Media",
      "Robot body",
      "Health",
      "Learning",
      "Utilities",
    ]),
    display: z.string().min(1).max(60),
    description: z.string().min(1).max(200),
    /**Optional (TOOL-EVENTS-01): the human label the turn stream's `tool_call` event carries while a package runs. Read from the manifest's own entry, so the label is the package's, not the route's. When it contains a `{place}` (or other `{arg}`) slot, the engine fills it from the call's `args` when that arg is present, else omits the slot entirely. Absent: the timeline falls back to the package's `display` name.*/
    tool_label: z
      .string()
      .min(1)
      .max(120)
      .describe(
        "Optional (TOOL-EVENTS-01): the human label the turn stream's `tool_call` event carries while a package runs. Read from the manifest's own entry, so the label is the package's, not the route's. When it contains a `{place}` (or other `{arg}`) slot, the engine fills it from the call's `args` when that arg is present, else omits the slot entirely. Absent: the timeline falls back to the package's `display` name.",
      )
      .optional(),
    /**TOOL-OFFER-01: whether this package tool may be offered to an adult written chat model. Home derives the live set from installed, enabled, smoke-healthy packages and the selected model's max_tools; absent means not measured and therefore not offered. `base` is part of the measured base set, `conditional` requires a declared gate and benchmark row, and `off` requires a reason.*/
    offer: z
      .object({
        mode: z.enum(["base", "conditional", "off"]),
        gate: z.string().min(1).optional(),
        bench_row: z.string().min(1).optional(),
        priority: z.number().int().gte(0).optional(),
        reason: z.string().min(1).max(200).optional(),
      })
      .strict()
      .describe(
        "TOOL-OFFER-01: whether this package tool may be offered to an adult written chat model. Home derives the live set from installed, enabled, smoke-healthy packages and the selected model's max_tools; absent means not measured and therefore not offered. `base` is part of the measured base set, `conditional` requires a declared gate and benchmark row, and `off` requires a reason.",
      )
      .optional(),
    author: z.string().min(1),
    license: z.string().min(1),
    homepage: z.string().url().optional(),
    routing: z
      .object({
        /**Five or more, required at bronze (docs/PACKAGES.md).*/
        examples: z
          .array(z.string().min(1))
          .min(5)
          .describe("Five or more, required at bronze (docs/PACKAGES.md).")
          .optional(),
        patterns: z.array(z.string().min(1)).optional(),
        /**Fix E (home/docs/dev.md, 'Chat reliability'): offered as a Tier 2 tool on every turn, regardless of this package's own embedding score against `examples` - never gated by the ambiguous-floor pre-filter (route()'s TIER2_AMBIGUOUS_FLOOR) that every other package still is. For a genuinely open-ended fallback capability (websearch is the first: no fixed vocabulary describes 'a question that needs a live lookup') where the pre-filter's own false negatives are common and costly, and native tool calling's own measured false-call rate (0% across the real corpus) makes the model's own judgment a better gate than a similarity score. Not a general escape from the floor: a package still needs a real role match and a manifest entry to be considered at all, and MAX_TIER2_TOOLS_OFFERED's own cap still bounds how many always-offered packages can exist before the prompt grows unbounded - use sparingly, for real fallback capabilities only, never as a way to skip tuning `examples`.*/
        always_offer: z
          .boolean()
          .describe(
            "Fix E (home/docs/dev.md, 'Chat reliability'): offered as a Tier 2 tool on every turn, regardless of this package's own embedding score against `examples` - never gated by the ambiguous-floor pre-filter (route()'s TIER2_AMBIGUOUS_FLOOR) that every other package still is. For a genuinely open-ended fallback capability (websearch is the first: no fixed vocabulary describes 'a question that needs a live lookup') where the pre-filter's own false negatives are common and costly, and native tool calling's own measured false-call rate (0% across the real corpus) makes the model's own judgment a better gate than a similarity score. Not a general escape from the floor: a package still needs a real role match and a manifest entry to be considered at all, and MAX_TIER2_TOOLS_OFFERED's own cap still bounds how many always-offered packages can exist before the prompt grows unbounded - use sparingly, for real fallback capabilities only, never as a way to skip tuning `examples`.",
          )
          .optional(),
        /**CHAT-13 chunk D (home/docs/dev.md section 16 part 3, rule 3): the small vocabulary of entity kinds a package declares it answers, one field, read by routeSemantic's canFire(). A semantic winner whose captured argument carries an entity kind the manifest does not list is refused the win (the utterance goes on to the model, Tier 2, or the Tier 1 compute) instead of the fixed-answer package answering it - a weekday or relative date ('what date is next Friday') is not a holiday, so the holiday package (which declares []) cannot win it. The kinds are the kinds the deterministic tiers already extract (weekday, relative_date, clock_time, number, proper_noun), not the record entity kinds (person, pet, place, organization, thing).*/
        answers: z
          .array(
            z.enum([
              "weekday",
              "relative_date",
              "clock_time",
              "number",
              "proper_noun",
            ]),
          )
          .describe(
            "CHAT-13 chunk D (home/docs/dev.md section 16 part 3, rule 3): the small vocabulary of entity kinds a package declares it answers, one field, read by routeSemantic's canFire(). A semantic winner whose captured argument carries an entity kind the manifest does not list is refused the win (the utterance goes on to the model, Tier 2, or the Tier 1 compute) instead of the fixed-answer package answering it - a weekday or relative date ('what date is next Friday') is not a holiday, so the holiday package (which declares []) cannot win it. The kinds are the kinds the deterministic tiers already extract (weekday, relative_date, clock_time, number, proper_noun), not the record entity kinds (person, pet, place, organization, thing).",
          )
          .optional(),
      })
      .strict()
      .optional(),
    /**Required when kind is "companion" (session-a-intelligence.md step 8), unused otherwise. Composed by home/backend/src/lib/persona.ts into the turn engine's identity line and system-prompt fragment: display_name replaces the hardcoded "MaiPai" in "You are {display_name}, ...", the four style dials are the same ones lib/persona.ts already had before companions were packages, and examples is a short few-shot block (legacy's own finding: "the single biggest lever for small-model voice fidelity").*/
    companion: z
      .object({
        display_name: z.string().min(1).max(40),
        pronouns: z.string().min(1).max(20).optional(),
        tagline: z.string().min(1).max(80).optional(),
        /**Short by design: no authoring UI exists yet to keep a longer one consistent with itself turn to turn (docs/dev.md's persona research).*/
        backstory: z
          .string()
          .min(1)
          .max(400)
          .describe(
            "Short by design: no authoring UI exists yet to keep a longer one consistent with itself turn to turn (docs/dev.md's persona research).",
          )
          .optional(),
        interests: z.array(z.string().min(1)).max(8).optional(),
        /**3 to 5 lines in the character's own voice, composed as a few-shot block.*/
        examples: z
          .array(z.string().min(1))
          .min(3)
          .max(5)
          .describe(
            "3 to 5 lines in the character's own voice, composed as a few-shot block.",
          )
          .optional(),
        voice_id: z.string().min(1).optional(),
        formality: z.enum(["casual", "neutral", "formal"]),
        complexity: z.enum(["simple", "standard", "advanced"]),
        engagement: z.enum(["brief", "balanced", "curious"]),
        filler_density: z.enum(["none", "light", "frequent"]),
        /**STATUS-PHRASES-01: this companion's own waiting-line phrases, replacing status-phrases/default.json's set one moment at a time - a moment left out here falls back to the default set for that moment. `thinking` shows before the first token, `searching` while a lookup or tool runs (a tool's own real label, TOOL-EVENTS-01/02, wins over any of these), `checking` during the phrasing round after a tool. Written chat only; the spoken surface keeps its own thinking-cue mechanism unchanged. Each property inlines the identical array shape rather than a same-file $ref - gen-ts.ts's own header warns that $RefParser.dereference() has corrupted an internal oneOf here before (recipe.schema.json's own steps); not worth risking on three short arrays.*/
        status_phrases: z
          .object({
            thinking: z
              .array(z.string().regex(new RegExp("…$")).min(1).max(40))
              .min(1)
              .optional(),
            searching: z
              .array(z.string().regex(new RegExp("…$")).min(1).max(40))
              .min(1)
              .optional(),
            checking: z
              .array(z.string().regex(new RegExp("…$")).min(1).max(40))
              .min(1)
              .optional(),
          })
          .strict()
          .describe(
            "STATUS-PHRASES-01: this companion's own waiting-line phrases, replacing status-phrases/default.json's set one moment at a time - a moment left out here falls back to the default set for that moment. `thinking` shows before the first token, `searching` while a lookup or tool runs (a tool's own real label, TOOL-EVENTS-01/02, wins over any of these), `checking` during the phrasing round after a tool. Written chat only; the spoken surface keeps its own thinking-cue mechanism unchanged. Each property inlines the identical array shape rather than a same-file $ref - gen-ts.ts's own header warns that $RefParser.dereference() has corrupted an internal oneOf here before (recipe.schema.json's own steps); not worth risking on three short arrays.",
          )
          .optional(),
        /**Trained per-companion voice adapters by base model, as designed in the EVAL-03 design pass.*/
        style_adapters: z
          .array(
            z
              .object({
                base_model: z.string(),
                format: z.literal("gguf-lora"),
                url: z.string().regex(new RegExp("^https://")),
                sha256: z.string().regex(new RegExp("^[a-f0-9]{64}$")),
                approx_bytes: z.number().int().gte(1),
                corpus_sha256: z.string().regex(new RegExp("^[a-f0-9]{64}$")),
              })
              .strict(),
          )
          .max(8)
          .describe(
            "Trained per-companion voice adapters by base model, as designed in the EVAL-03 design pass.",
          )
          .optional(),
      })
      .strict()
      .describe(
        'Required when kind is "companion" (session-a-intelligence.md step 8), unused otherwise. Composed by home/backend/src/lib/persona.ts into the turn engine\'s identity line and system-prompt fragment: display_name replaces the hardcoded "MaiPai" in "You are {display_name}, ...", the four style dials are the same ones lib/persona.ts already had before companions were packages, and examples is a short few-shot block (legacy\'s own finding: "the single biggest lever for small-model voice fidelity").',
      )
      .optional(),
    /**Required when kind is "reference" (an offline archive), and for a live plugin package that is one of the household's knowledge sources for `lookup()`'s federation (home/docs/plans/knowledge-sources-2026-09-24.md, "Routing: one lookup, not one tool per source" - the resident model chooses badly between one tool per source, home#150, dev.md PHRASE-02 and DOC-TOOL-01, so every source is reached behind the one search tool instead); unused otherwise. Declares what this source is and, for an archive, every size a person could install, so Home's sizing wizard ("proposed, never fixed": it measures the chosen drive's free space and the hardware tier, recommends a flavour and bundle, and shows the size impact) reads `flavours[].approx_bytes` straight from the manifest, never a live network call.*/
    knowledge_source: z
      .object({
        /**"archive": a local, offline snapshot (a Kiwix ZIM or similar), searched with nothing sent out. "live": a network source, reached at call time.*/
        origin: z
          .enum(["archive", "live"])
          .describe(
            '"archive": a local, offline snapshot (a Kiwix ZIM or similar), searched with nothing sent out. "live": a network source, reached at call time.',
          ),
        /**The underlying work's own id (Kiwix's own naming, e.g. "wikipedia", "wiktionary", "ifixit"). Required for an archive; a live source names what it queries in its own `description` instead.*/
        book: z
          .string()
          .min(1)
          .describe(
            'The underlying work\'s own id (Kiwix\'s own naming, e.g. "wikipedia", "wiktionary", "ifixit"). Required for an archive; a live source names what it queries in its own `description` instead.',
          )
          .optional(),
        /**ISO 639 codes for the language(s) this source's content is in.*/
        languages: z
          .array(z.string().regex(new RegExp("^[a-z]{2,3}$")))
          .min(1)
          .describe(
            "ISO 639 codes for the language(s) this source's content is in.",
          )
          .optional(),
        /**Every installable size/date combination for an archive source, one entry per flavour; empty or absent for a live source.*/
        flavours: z
          .array(
            z
              .object({
                /**The archive's own flavour id (Kiwix: e.g. "maxi", "nopic", "mini").*/
                id: z
                  .string()
                  .min(1)
                  .describe(
                    'The archive\'s own flavour id (Kiwix: e.g. "maxi", "nopic", "mini").',
                  ),
                /**The sizing input Home's wizard shows before a person picks a flavour - measured against the publisher's own catalog, never computed.*/
                approx_bytes: z
                  .number()
                  .int()
                  .gte(1)
                  .describe(
                    "The sizing input Home's wizard shows before a person picks a flavour - measured against the publisher's own catalog, never computed.",
                  ),
                /**The date this flavour's own content was captured; an archive knows nothing after it (the design's own "why": a stale answer is labelled by this date, never presented as current).*/
                snapshot_date: z
                  .string()
                  .date()
                  .describe(
                    "The date this flavour's own content was captured; an archive knows nothing after it (the design's own \"why\": a stale answer is labelled by this date, never presented as current).",
                  ),
              })
              .strict(),
          )
          .describe(
            "Every installable size/date combination for an archive source, one entry per flavour; empty or absent for a live source.",
          )
          .optional(),
        /**"snapshot": as of the installed flavour's own `snapshot_date`, nothing newer - the phrasing round labels a row from this source with that date. "live": minutes old, fetched at call time. Mirrors `origin` today (an archive is always a snapshot, a live source is always live) but stated as its own field since a future cached or scheduled-refresh live source could report a snapshot without changing what `origin` it is.*/
        freshness: z
          .enum(["snapshot", "live"])
          .describe(
            '"snapshot": as of the installed flavour\'s own `snapshot_date`, nothing newer - the phrasing round labels a row from this source with that date. "live": minutes old, fetched at call time. Mirrors `origin` today (an archive is always a snapshot, a live source is always live) but stated as its own field since a future cached or scheduled-refresh live source could report a snapshot without changing what `origin` it is.',
          ),
        /**Required when `origin` is "live": the id of one of this package's own `exposes.queries[]` entries (5.4's typed-read mechanism, already generic) that `lookup()`'s host machinery calls to search this source - `{query: string}` args, a `Source[]`-shaped array (source.schema.json) returned. The one thing Home's own federation needs to know about a live source's code; everything else (the request, the parsing, the rate limiting) is the package's own, per "Home stays lean" (home/docs/plans/feeds-and-archive-2026-09-24.md) - a live knowledge source is a catalog plugin like any other, never source-specific code in Home. Absent for an archive: `origin: "archive"` sources are searched through the shared kiwix-serve sidecar (host machinery, no package code involved), never through a query of their own.*/
        query_id: z
          .string()
          .min(1)
          .describe(
            "Required when `origin` is \"live\": the id of one of this package's own `exposes.queries[]` entries (5.4's typed-read mechanism, already generic) that `lookup()`'s host machinery calls to search this source - `{query: string}` args, a `Source[]`-shaped array (source.schema.json) returned. The one thing Home's own federation needs to know about a live source's code; everything else (the request, the parsing, the rate limiting) is the package's own, per \"Home stays lean\" (home/docs/plans/feeds-and-archive-2026-09-24.md) - a live knowledge source is a catalog plugin like any other, never source-specific code in Home. Absent for an archive: `origin: \"archive\"` sources are searched through the shared kiwix-serve sidecar (host machinery, no package code involved), never through a query of their own.",
          )
          .optional(),
      })
      .strict()
      .describe(
        'Required when kind is "reference" (an offline archive), and for a live plugin package that is one of the household\'s knowledge sources for `lookup()`\'s federation (home/docs/plans/knowledge-sources-2026-09-24.md, "Routing: one lookup, not one tool per source" - the resident model chooses badly between one tool per source, home#150, dev.md PHRASE-02 and DOC-TOOL-01, so every source is reached behind the one search tool instead); unused otherwise. Declares what this source is and, for an archive, every size a person could install, so Home\'s sizing wizard ("proposed, never fixed": it measures the chosen drive\'s free space and the hardware tier, recommends a flavour and bundle, and shows the size impact) reads `flavours[].approx_bytes` straight from the manifest, never a live network call.',
      )
      .optional(),
    /**A JSON Schema for this package's call arguments.*/
    args: z
      .any()
      .describe("A JSON Schema for this package's call arguments.")
      .optional(),
    /**INCOGNITO-04: this package's behavior while Incognito is on. Required, never defaulted - a manifest that omits it fails validation the same way a manifest missing any other required field does, enforced by the one shared reader every route/install check calls (loadManifestOnly()/loadPackage(), lib/plugins.ts). "blocked": unavailable while Incognito is on (sharing, CHANNELS-01, anything that publishes for the family). "ephemeral": works normally, nothing it writes persists past the session (chat, a generation app's own generated-content tab). "unaffected": no personal data touched, nothing to gate.*/
    incognito: z
      .enum(["blocked", "ephemeral", "unaffected"])
      .describe(
        'INCOGNITO-04: this package\'s behavior while Incognito is on. Required, never defaulted - a manifest that omits it fails validation the same way a manifest missing any other required field does, enforced by the one shared reader every route/install check calls (loadManifestOnly()/loadPackage(), lib/plugins.ts). "blocked": unavailable while Incognito is on (sharing, CHANNELS-01, anything that publishes for the family). "ephemeral": works normally, nothing it writes persists past the session (chat, a generation app\'s own generated-content tab). "unaffected": no personal data touched, nothing to gate.',
      ),
    /**Capabilities from the capability vocabulary (spec/vocab/capabilities.json) this package cannot run without.*/
    requires: z
      .array(z.string())
      .describe(
        "Capabilities from the capability vocabulary (spec/vocab/capabilities.json) this package cannot run without.",
      )
      .optional(),
    /**Capabilities that add behavior but are not required.*/
    optional: z
      .array(z.string())
      .describe("Capabilities that add behavior but are not required.")
      .optional(),
    /**GENUI-01: the answer-block kinds this package may return on `PluginResult.blocks`, so the host and the store card know what it can emit. Optional; absent means none. The host drops a returned block whose kind is not listed.*/
    returns_blocks: z
      .array(
        z
          .enum([
            "spec_sheet",
            "data_table",
            "chart",
            "timeline",
            "todo_list",
            "image_gallery",
            "schedule_card",
            "comparison",
          ])
          .describe(
            "The v1 answer-block kinds. Closed and additive: a later kind (series_chart, stat, split_bar, media_list, place_cards, map, swatches, tabs, filter_chips, calculator) lands with its kit Element and is appended here.",
          ),
      )
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "GENUI-01: the answer-block kinds this package may return on `PluginResult.blocks`, so the host and the store card know what it can emit. Optional; absent means none. The host drops a returned block whose kind is not listed.",
      )
      .optional(),
    platforms: z.array(z.enum(["home", "bot", "web"])).min(1),
    /**The floor role a person needs to invoke this package.*/
    min_role: z
      .enum(["owner", "admin", "adult", "teen", "child", "guest"])
      .describe("The floor role a person needs to invoke this package."),
    /**Raises the routing bar (4.5): a consequential plugin needs more confidence before it fires - the model must propose it, gated on the household's own confirmation, never a deterministic auto-fire. A consequential package must never also declare `routing.patterns`: turnEngine.ts's route() only enforces the raised bar on the fuzzy/Tier 2 path, so a literal pattern match would fire it immediately, bypassing confirmation entirely (a real gap found and fixed, session-d-packages-and-store.md step 9 - route() itself now also refuses to treat a consequential manifest's own patterns as live, so a manifest bug here can no longer be the only thing standing between a security domain and skipping confirmation, but the manifest still shouldn't declare one).*/
    consequential: z
      .boolean()
      .describe(
        "Raises the routing bar (4.5): a consequential plugin needs more confidence before it fires - the model must propose it, gated on the household's own confirmation, never a deterministic auto-fire. A consequential package must never also declare `routing.patterns`: turnEngine.ts's route() only enforces the raised bar on the fuzzy/Tier 2 path, so a literal pattern match would fire it immediately, bypassing confirmation entirely (a real gap found and fixed, session-d-packages-and-store.md step 9 - route() itself now also refuses to treat a consequential manifest's own patterns as live, so a manifest bug here can no longer be the only thing standing between a security domain and skipping confirmation, but the manifest still shouldn't declare one).",
      ),
    /**Stated offline behavior, required at bronze.*/
    offline: z
      .enum(["full", "degraded", "unavailable"])
      .describe("Stated offline behavior, required at bronze."),
    config: z
      .array(
        z
          .object({
            key: z
              .string()
              .regex(new RegExp("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$")),
            scope: z.enum(["household", "person", "device"]),
            /**Home Assistant's selector names (3.2).*/
            selector: z
              .enum([
                "number",
                "select",
                "text",
                "boolean",
                "duration",
                "time",
                "entity",
                "area",
                "person",
                "media",
              ])
              .describe("Home Assistant's selector names (3.2)."),
            /**Selector-specific: min/max for number, a duration unit, an option list for select, and so on. Shape depends on selector.*/
            range: z
              .object({
                options: z.array(z.string()).optional(),
                options_from: z.string().min(1).optional(),
              })
              .catchall(z.any())
              .describe(
                "Selector-specific: min/max for number, a duration unit, an option list for select, and so on. Shape depends on selector.",
              )
              .optional(),
            default: z.any(),
            label: z.string().min(1),
            help: z.string().optional(),
            copy: z
              .object({
                does: z.string().min(1),
                does_child: z.string().min(1).optional(),
                does_teen: z.string().min(1).optional(),
                options: z.record(z.string(), z.string().min(1)).optional(),
              })
              .strict()
              .optional(),
            control: z
              .object({
                child: z.enum(["self", "guardian"]),
                teen: z.enum(["self", "guardian"]),
                adult: z.enum(["self", "guardian"]),
              })
              .strict()
              .optional(),
            band_default: z
              .object({ child: z.any(), teen: z.any(), adult: z.any() })
              .strict()
              .optional(),
            section: z
              .object({
                id: z.string().optional(),
                collapsed: z.boolean().default(false),
                order: z.number().int().optional(),
              })
              .strict()
              .optional(),
            level: z.enum(["basic", "advanced", "expert"]),
            secret: z.boolean().default(false),
            /**Capabilities required for this key to apply.*/
            needs: z
              .array(z.string())
              .describe("Capabilities required for this key to apply.")
              .optional(),
            /**The package, companion, integration, or central page id that renders this key.*/
            lives_in: z
              .string()
              .describe(
                "The package, companion, integration, or central page id that renders this key.",
              ),
            honoured_by: z.array(z.enum(["home", "bot"])).min(1),
          })
          .strict()
          .describe(
            "One entry in the settings registry (spec/settings/keys.json) or a package manifest's config[]. See platform plan 3.2 and .github's docs/SETTINGS.md.",
          ),
      )
      .optional(),
    /**Feeds the generated privacy row (docs/ENGINEERING.md > Privacy). The shape is @maipai/standards' PrivacyRow, imported by $ref (std-v0.2.0).*/
    data_sources: z
      .array(
        z
          .object({
            id: z.string().min(1),
            /**The host or service this connects to, named descriptively (docs/PACKAGES.md, the org's Trademarks rule).*/
            destination: z
              .string()
              .describe(
                "The host or service this connects to, named descriptively (docs/PACKAGES.md, the org's Trademarks rule).",
              ),
            /**The trigger, in plain language: 'on package install', 'each time the family asks for weather', 'once a day at the update check'.*/
            when: z
              .string()
              .describe(
                "The trigger, in plain language: 'on package install', 'each time the family asks for weather', 'once a day at the update check'.",
              ),
            /**What this connection carries, in plain language.*/
            what: z
              .string()
              .describe("What this connection carries, in plain language."),
            /**Who receives it: the named third-party service, or 'nobody, this stays on the LAN'.*/
            who: z
              .string()
              .describe(
                "Who receives it: the named third-party service, or 'nobody, this stays on the LAN'.",
              ),
            /**False only for the handful of core, always-on connections (update checks, the store's signed index); every integration is opt_in: true.*/
            opt_in: z
              .boolean()
              .describe(
                "False only for the handful of core, always-on connections (update checks, the store's signed index); every integration is opt_in: true.",
              ),
            /**How long the destination keeps it, in plain language, or 'unknown, see the service's own policy' when the household does not control it.*/
            retention: z
              .string()
              .describe(
                "How long the destination keeps it, in plain language, or 'unknown, see the service's own policy' when the household does not control it.",
              ),
          })
          .strict()
          .describe(
            "One row of a 'what leaves the house' table: one outbound connection a package declares in its manifest's data_sources[]. The generated privacy page (docs/ENGINEERING.md > Privacy, CLAUDE.md > Privacy architecture) is built entirely from these declarations, never hand-maintained.",
          ),
      )
      .describe(
        "Feeds the generated privacy row (docs/ENGINEERING.md > Privacy). The shape is @maipai/standards' PrivacyRow, imported by $ref (std-v0.2.0).",
      )
      .optional(),
    /**The capabilities this package needs for health derivation.*/
    needs: z
      .array(
        z
          .object({
            kind: z.enum(["engine", "service", "internet"]),
            id: z
              .string()
              .regex(new RegExp("^[a-z0-9][a-z0-9_-]*$"))
              .min(1)
              .max(64),
            name: z.string().min(1).max(80),
            purpose: z.string().min(1).max(200),
            required: z.boolean(),
          })
          .strict(),
      )
      .describe("The capabilities this package needs for health derivation.")
      .optional(),
    /**From the fixed permissions enum (spec/vocab/permissions.json).*/
    permissions: z
      .array(z.string())
      .describe(
        "From the fixed permissions enum (spec/vocab/permissions.json).",
      )
      .optional(),
    /**Notification types this package declares, per docs/NOTIFICATIONS.md - registered into home/backend/src/lib/notificationTypes.ts's shared registry at load (registerPackageNotificationTypes()).*/
    notifications: z
      .array(
        z
          .object({
            /**Namespaced by the package's own id (e.g. `weather.severe_alert`) so two packages can never collide in F's shared registry.*/
            id: z
              .string()
              .regex(new RegExp("^[a-z0-9_.-]+$"))
              .describe(
                "Namespaced by the package's own id (e.g. `weather.severe_alert`) so two packages can never collide in F's shared registry.",
              ),
            level: z.enum(["immediate", "time_sensitive", "passive"]),
            audience: z.enum(["person", "household", "adults"]),
            /**`{var}`-interpolated, per docs/NOTIFICATIONS.md.*/
            template: z
              .string()
              .min(1)
              .describe("`{var}`-interpolated, per docs/NOTIFICATIONS.md."),
            configurable: z.boolean(),
            /**Whether the notification is private. If absent, consumers must treat it as private.*/
            privacy: z
              .boolean()
              .describe(
                "Whether the notification is private. If absent, consumers must treat it as private.",
              )
              .optional(),
            default_channels: z
              .array(z.enum(["in_app", "telegram", "robot"]))
              .min(1),
            /**Actions available for the safety.alarm notification type.*/
            actions: z
              .array(z.enum(["acknowledge", "quiet_here", "false_alarm"]))
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "Actions available for the safety.alarm notification type.",
              )
              .optional(),
          })
          .strict(),
      )
      .describe(
        "Notification types this package declares, per docs/NOTIFICATIONS.md - registered into home/backend/src/lib/notificationTypes.ts's shared registry at load (registerPackageNotificationTypes()).",
      )
      .optional(),
    /**How lib/packageCache.ts (session-d-packages-and-store.md step 3) keys and bounds this package's own cache. `additionalProperties: true` on purpose: a package's `host.fetch` call sites decide their own extra per-entry hints (4.10), this just fixes the ones the cache mechanism itself reads.*/
    cache: z
      .object({
        /**A `{arg}`-interpolated template (e.g. `weather:{place}`) naming one cache entry per distinct call.*/
        key_template: z
          .string()
          .min(1)
          .describe(
            "A `{arg}`-interpolated template (e.g. `weather:{place}`) naming one cache entry per distinct call.",
          )
          .optional(),
        /**Fresh for this long; served straight from cache with no fetch.*/
        ttl_s: z
          .number()
          .int()
          .gte(1)
          .describe(
            "Fresh for this long; served straight from cache with no fetch.",
          )
          .optional(),
        /**Beyond ttl_s but within this, served immediately while a revalidation fetch runs in the background (stale-while-revalidate).*/
        stale_ok_s: z
          .number()
          .int()
          .gte(0)
          .describe(
            "Beyond ttl_s but within this, served immediately while a revalidation fetch runs in the background (stale-while-revalidate).",
          )
          .optional(),
        /**Per-entry size ceiling; a fetch response over this is never cached.*/
        max_bytes: z
          .number()
          .int()
          .gte(1)
          .describe(
            "Per-entry size ceiling; a fetch response over this is never cached.",
          )
          .optional(),
      })
      .catchall(z.any())
      .describe(
        "How lib/packageCache.ts (session-d-packages-and-store.md step 3) keys and bounds this package's own cache. `additionalProperties: true` on purpose: a package's `host.fetch` call sites decide their own extra per-entry hints (4.10), this just fixes the ones the cache mechanism itself reads.",
      )
      .optional(),
    /**A scheduled job that pre-populates this package's cache before anyone asks, so a common answer (the household's own weather) never waits on a live fetch.*/
    warm: z
      .object({
        /**The same `every:<n><m|h|d>` grammar lib/scheduler.ts's core jobs already use.*/
        schedule: z
          .string()
          .regex(new RegExp("^every:[0-9]+(m|h|d)$"))
          .describe(
            "The same `every:<n><m|h|d>` grammar lib/scheduler.ts's core jobs already use.",
          )
          .optional(),
        /**The recipe inputs to warm with, one object per cache entry (e.g. `[{ "place": "household's home place" }]`); resolved against household settings/state at warm time, not stored as literal values here.*/
        keys: z
          .array(z.record(z.string(), z.any()))
          .describe(
            'The recipe inputs to warm with, one object per cache entry (e.g. `[{ "place": "household\'s home place" }]`); resolved against household settings/state at warm time, not stored as literal values here.',
          )
          .optional(),
      })
      .catchall(z.any())
      .describe(
        "A scheduled job that pre-populates this package's cache before anyone asks, so a common answer (the household's own weather) never waits on a live fetch.",
      )
      .optional(),
    /**Setting keys (spec/settings/keys.json ids) whose change should trigger an immediate warm outside `warm.schedule` - e.g. `household.home_place` changing re-warms `weather` right away instead of waiting for the next scheduled tick.*/
    warm_on: z
      .array(z.string().min(1))
      .describe(
        "Setting keys (spec/settings/keys.json ids) whose change should trigger an immediate warm outside `warm.schedule` - e.g. `household.home_place` changing re-warms `weather` right away instead of waiting for the next scheduled tick.",
      )
      .optional(),
    backup: z.enum(["hot", "cold", "exclude"]).optional(),
    background: z.boolean().default(false),
    /**Shell blueprints (6.1), keyed by blueprint kind: nav entries, pages, right-pane panels, settings sections, commands, quick actions, player hooks, admin sections. `additionalProperties: true` since most of 6.1's own blueprint kinds have no bundled package using them yet (Wave 1's `contributes: []` was a placeholder no package had populated); `widgets` and `pages` below are the two sub-fields session-d-packages-and-store.md steps 2/10 fix a real shape for. `pages` replaces a redundant top-level `pages: string[]` field (Session E flagged it 2026-09-06 as incompatible with this object shape and confirmed nothing in backend/src or frontend/src read it) - a package declaring a page uses `contributes.pages[]` now, never a second, competing field.*/
    contributes: z
      .object({
        /**This package's own settings area (SPEC-SETAREA-01): an app's settings page, drawn by the one settings shell and opened from the app's gear. Same record as spec/settings/areas.json. The manifest lint (spec/settings/areas-check.ts) refuses an area id that is a reserved legacy route id or a central area (account, home, chat).*/
        settings_area: z
          .object({
            /**Route segment: /settings/<id>/<section>. Unique. The nine ids in $defs.reservedIds are static legacy routes that already own those paths; areas-check.ts refuses them (a JSON Schema `not` would drop this pattern from the generated models).*/
            id: z
              .string()
              .regex(new RegExp("^[a-z][a-z0-9-]{0,31}$"))
              .describe(
                "Route segment: /settings/<id>/<section>. Unique. The nine ids in $defs.reservedIds are static legacy routes that already own those paths; areas-check.ts refuses them (a JSON Schema `not` would drop this pattern from the generated models).",
              ),
            /**The settings column's heading.*/
            title: z
              .string()
              .min(1)
              .max(40)
              .describe("The settings column's heading."),
            /**The nav entry that owns this area, so the app's header gets a gear. Absent for Account and Home settings.*/
            app: z
              .string()
              .regex(new RegExp("^/[A-Za-z0-9/_-]*$"))
              .describe(
                "The nav entry that owns this area, so the app's header gets a gear. Absent for Account and Home settings.",
              )
              .optional(),
            /**Who sees the area at all.*/
            audience: z
              .object({
                /**The role ladder, most to least privileged. min_role is the lowest role that may see the thing.*/
                min_role: z
                  .enum(["owner", "admin", "adult", "teen", "child", "guest"])
                  .describe(
                    "The role ladder, most to least privileged. min_role is the lowest role that may see the thing.",
                  ),
              })
              .strict()
              .describe("Who sees the area at all."),
            /**Sidebar groups, in order. Every section is listed in exactly one.*/
            groups: z
              .array(
                z
                  .object({
                    label: z.string().min(1).max(40),
                    sections: z.array(z.string()).min(1),
                  })
                  .strict(),
              )
              .min(1)
              .describe(
                "Sidebar groups, in order. Every section is listed in exactly one.",
              ),
            sections: z
              .array(
                z
                  .object({
                    /**Unique within its area.*/
                    id: z
                      .string()
                      .regex(new RegExp("^[a-z][a-z0-9-]{0,31}$"))
                      .describe("Unique within its area."),
                    label: z.string().min(1).max(40),
                    icon: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
                    /**keys draws cards; view draws one named Home view; link draws an arrow row that navigates.*/
                    kind: z
                      .enum(["keys", "view", "link"])
                      .describe(
                        "keys draws cards; view draws one named Home view; link draws an arrow row that navigates.",
                      ),
                    cards: z
                      .array(
                        z
                          .object({
                            /**The card's heading; the one place a group's title is written.*/
                            label: z
                              .string()
                              .min(1)
                              .max(60)
                              .describe(
                                "The card's heading; the one place a group's title is written.",
                              ),
                            /**A registry group: SettingsKey lives_in.*/
                            group: z
                              .string()
                              .min(1)
                              .describe(
                                "A registry group: SettingsKey lives_in.",
                              )
                              .optional(),
                            scope: z
                              .enum(["household", "person", "device"])
                              .optional(),
                            /**Which key levels this card draws. Absent means basic and advanced. Expert keys are drawn only by a card in a section with id developer, whose levels are exactly [expert].*/
                            levels: z
                              .array(z.enum(["basic", "advanced", "expert"]))
                              .min(1)
                              .refine(
                                (arr) =>
                                  arr.every(
                                    (item, i) => arr.indexOf(item) == i,
                                  ),
                                "All items must be unique!",
                              )
                              .describe(
                                "Which key levels this card draws. Absent means basic and advanced. Expert keys are drawn only by a card in a section with id developer, whose levels are exactly [expert].",
                              )
                              .optional(),
                            /**A card of link rows to existing pages instead of keys.*/
                            links: z
                              .array(
                                z
                                  .object({
                                    label: z.string().min(1).max(60),
                                    /**An in-app path. {self} is the only placeholder, resolved on the client to the viewer's own id; no other person id can appear.*/
                                    href: z
                                      .string()
                                      .regex(
                                        new RegExp("^/([^{}]|\\{self\\})*$"),
                                      )
                                      .describe(
                                        "An in-app path. {self} is the only placeholder, resolved on the client to the viewer's own id; no other person id can appear.",
                                      ),
                                    icon: z
                                      .string()
                                      .regex(new RegExp("^[a-z][a-z0-9-]*$"))
                                      .optional(),
                                    /**The role ladder, most to least privileged. min_role is the lowest role that may see the thing.*/
                                    min_role: z
                                      .enum([
                                        "owner",
                                        "admin",
                                        "adult",
                                        "teen",
                                        "child",
                                        "guest",
                                      ])
                                      .describe(
                                        "The role ladder, most to least privileged. min_role is the lowest role that may see the thing.",
                                      )
                                      .optional(),
                                  })
                                  .strict(),
                              )
                              .min(1)
                              .describe(
                                "A card of link rows to existing pages instead of keys.",
                              )
                              .optional(),
                            collapsed: z.boolean().default(false),
                            order: z.number().int().optional(),
                            /**The role ladder, most to least privileged. min_role is the lowest role that may see the thing.*/
                            min_role: z
                              .enum([
                                "owner",
                                "admin",
                                "adult",
                                "teen",
                                "child",
                                "guest",
                              ])
                              .describe(
                                "The role ladder, most to least privileged. min_role is the lowest role that may see the thing.",
                              )
                              .optional(),
                            bands: z
                              .array(z.enum(["child", "teen", "adult"]))
                              .min(1)
                              .refine(
                                (arr) =>
                                  arr.every(
                                    (item, i) => arr.indexOf(item) == i,
                                  ),
                                "All items must be unique!",
                              )
                              .optional(),
                            needs: z
                              .array(z.string().min(1))
                              .refine(
                                (arr) =>
                                  arr.every(
                                    (item, i) => arr.indexOf(item) == i,
                                  ),
                                "All items must be unique!",
                              )
                              .optional(),
                          })
                          .strict()
                          .describe(
                            "One card: either a registry group at one scope (group and scope together) or a list of link rows (links), never both. areas-check.ts enforces the pairing.",
                          ),
                      )
                      .min(1)
                      .optional(),
                    /**keys only: a view drawn above the cards.*/
                    lead_view: z
                      .enum([
                        "account.profile",
                        "account.voice",
                        "account.device_appearance",
                        "chat.skills",
                        "chat.shortcuts",
                        "home.commands",
                        "home.voice_catalog",
                      ])
                      .describe("keys only: a view drawn above the cards.")
                      .optional(),
                    /**keys only: a view drawn below the cards.*/
                    trail_view: z
                      .enum([
                        "account.profile",
                        "account.voice",
                        "account.device_appearance",
                        "chat.skills",
                        "chat.shortcuts",
                        "home.commands",
                        "home.voice_catalog",
                      ])
                      .describe("keys only: a view drawn below the cards.")
                      .optional(),
                    /**A named view in Home's view table. The list is closed so a package cannot name one Home does not have.*/
                    view: z
                      .enum([
                        "account.profile",
                        "account.voice",
                        "account.device_appearance",
                        "chat.skills",
                        "chat.shortcuts",
                        "home.commands",
                        "home.voice_catalog",
                      ])
                      .describe(
                        "A named view in Home's view table. The list is closed so a package cannot name one Home does not have.",
                      )
                      .optional(),
                    /**An in-app path. {self} is the only placeholder, resolved on the client to the viewer's own id; no other person id can appear.*/
                    href: z
                      .string()
                      .regex(new RegExp("^/([^{}]|\\{self\\})*$"))
                      .describe(
                        "An in-app path. {self} is the only placeholder, resolved on the client to the viewer's own id; no other person id can appear.",
                      )
                      .optional(),
                    /**Extra words the area's own search matches.*/
                    keywords: z
                      .array(z.string().min(1))
                      .refine(
                        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                        "All items must be unique!",
                      )
                      .describe("Extra words the area's own search matches.")
                      .optional(),
                    order: z.number().int().optional(),
                    /**The role ladder, most to least privileged. min_role is the lowest role that may see the thing.*/
                    min_role: z
                      .enum([
                        "owner",
                        "admin",
                        "adult",
                        "teen",
                        "child",
                        "guest",
                      ])
                      .describe(
                        "The role ladder, most to least privileged. min_role is the lowest role that may see the thing.",
                      )
                      .optional(),
                    bands: z
                      .array(z.enum(["child", "teen", "adult"]))
                      .min(1)
                      .refine(
                        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                        "All items must be unique!",
                      )
                      .optional(),
                    needs: z
                      .array(z.string().min(1))
                      .refine(
                        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                        "All items must be unique!",
                      )
                      .optional(),
                  })
                  .strict()
                  .and(
                    z.intersection(z.any(), z.intersection(z.any(), z.any())),
                  )
                  .describe(
                    "One section. kind keys needs cards, view needs a view, link needs an href. areas-check.ts refuses fields that belong to another kind.",
                  ),
              )
              .min(1),
          })
          .strict()
          .describe(
            "This package's own settings area (SPEC-SETAREA-01): an app's settings page, drawn by the one settings shell and opened from the app's gear. Same record as spec/settings/areas.json. The manifest lint (spec/settings/areas-check.ts) refuses an area id that is a reserved legacy route id or a central area (account, home, chat).",
          )
          .optional(),
        /**wave-2.md's D-to-E contract: `GET /api/widgets` and `GET /api/widgets/:package/:id/data` list and serve these.*/
        widgets: z
          .array(
            z
              .object({
                id: z.string().min(1),
                title: z.string().min(1).max(40),
                size: z.enum(["card", "row"]),
                /**How often Home should re-fetch this widget's data; the data itself still only ever comes from lib/packageCache.ts (step 3's own rule: never a live fetch in the request path).*/
                refresh_s: z
                  .number()
                  .int()
                  .gte(1)
                  .describe(
                    "How often Home should re-fetch this widget's data; the data itself still only ever comes from lib/packageCache.ts (step 3's own rule: never a live fetch in the request path).",
                  ),
                /**Resolved the same way `warm.keys` are - against household settings/state, not literal values in the manifest.*/
                inputs: z
                  .record(z.string(), z.any())
                  .describe(
                    "Resolved the same way `warm.keys` are - against household settings/state, not literal values in the manifest.",
                  )
                  .optional(),
              })
              .strict(),
          )
          .describe(
            "wave-2.md's D-to-E contract: `GET /api/widgets` and `GET /api/widgets/:package/:id/data` list and serve these.",
          )
          .optional(),
        /**6.2's own package-declared pages. E's PackageScopeContext and nav-registry merge (frontend/src/shell/nav.ts) are the real consumer; no package populates this yet.*/
        pages: z
          .array(
            z
              .object({
                /**Derives this page's own route: `/apps/<package id>/<page id>`, or bare `/apps/<package id>` when this is exactly "index".*/
                id: z
                  .string()
                  .min(1)
                  .describe(
                    'Derives this page\'s own route: `/apps/<package id>/<page id>`, or bare `/apps/<package id>` when this is exactly "index".',
                  ),
                icon: z.string().optional(),
                label: z.string().min(1).max(40),
                /**Whether this page gets its own entry in the shell's nav registry (frontend/src/shell/nav.ts), vs. being reachable only from elsewhere (e.g. a widget's own link).*/
                nav: z
                  .boolean()
                  .describe(
                    "Whether this page gets its own entry in the shell's nav registry (frontend/src/shell/nav.ts), vs. being reachable only from elsewhere (e.g. a widget's own link).",
                  ),
                /**"schema": spec/ui/schema.json document, rendered by the shared shell. "web" (this package's manifest must also list "web" under platforms): an escape hatch, unimplemented for all of Wave 2 - the loader refuses it outright, since a page a native Go/SwiftUI client can't render would break the platform's own "one UI schema, every client" promise.*/
                kind: z
                  .enum(["schema", "web"])
                  .describe(
                    '"schema": spec/ui/schema.json document, rendered by the shared shell. "web" (this package\'s manifest must also list "web" under platforms): an escape hatch, unimplemented for all of Wave 2 - the loader refuses it outright, since a page a native Go/SwiftUI client can\'t render would break the platform\'s own "one UI schema, every client" promise.',
                  ),
                /**The schema document id (kind: "schema") this page renders, served from GET /api/plugins/:id/pages/:pageId.*/
                module: z
                  .string()
                  .min(1)
                  .describe(
                    'The schema document id (kind: "schema") this page renders, served from GET /api/plugins/:id/pages/:pageId.',
                  ),
              })
              .strict(),
          )
          .describe(
            "6.2's own package-declared pages. E's PackageScopeContext and nav-registry merge (frontend/src/shell/nav.ts) are the real consumer; no package populates this yet.",
          )
          .optional(),
      })
      .catchall(z.any())
      .describe(
        "Shell blueprints (6.1), keyed by blueprint kind: nav entries, pages, right-pane panels, settings sections, commands, quick actions, player hooks, admin sections. `additionalProperties: true` since most of 6.1's own blueprint kinds have no bundled package using them yet (Wave 1's `contributes: []` was a placeholder no package had populated); `widgets` and `pages` below are the two sub-fields session-d-packages-and-store.md steps 2/10 fix a real shape for. `pages` replaces a redundant top-level `pages: string[]` field (Session E flagged it 2026-09-06 as incompatible with this object shape and confirmed nothing in backend/src or frontend/src read it) - a package declaring a page uses `contributes.pages[]` now, never a second, competing field.",
      )
      .optional(),
    /**A declared setup flow, the one escape hatch beyond a plain settings form (docs/SETTINGS.md rule 1).*/
    setup: z
      .record(z.string(), z.any())
      .describe(
        "A declared setup flow, the one escape hatch beyond a plain settings form (docs/SETTINGS.md rule 1).",
      )
      .optional(),
    /**For integrations: what this package makes available to others (5.4).*/
    provides: z
      .array(z.string())
      .describe(
        "For integrations: what this package makes available to others (5.4).",
      )
      .optional(),
    /**Minimum hub/robot version this package needs.*/
    min_app: z
      .string()
      .regex(new RegExp("^[0-9]+\\.[0-9]+\\.[0-9]+$"))
      .describe("Minimum hub/robot version this package needs."),
    /**The @maipai/ui ui-v tag this package's UI was built against, if it ships one.*/
    kit_version: z
      .string()
      .describe(
        "The @maipai/ui ui-v tag this package's UI was built against, if it ships one.",
      )
      .optional(),
    /**Default reply shape hints for the router, if any.*/
    reply: z
      .record(z.string(), z.any())
      .describe("Default reply shape hints for the router, if any.")
      .optional(),
    /**Bounds handle(). Defaults per 4.9: 4000 on the robot, 8000 on the hub.*/
    timeout_ms: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Bounds handle(). Defaults per 4.9: 4000 on the robot, 8000 on the hub.",
      )
      .optional(),
    /**A Tier 1 package's own answer when its Deno process crashes or times out (session-d-packages-and-store.md step 5) - required practically, not just structurally, for a Tier 1 package to clear bronze, since a crash with nothing to say is a dead end for whoever asked.*/
    fallback_reply: z
      .object({ text: z.string().min(1), speech: z.string().min(1).optional() })
      .strict()
      .describe(
        "A Tier 1 package's own answer when its Deno process crashes or times out (session-d-packages-and-store.md step 5) - required practically, not just structurally, for a Tier 1 package to clear bronze, since a crash with nothing to say is a dead end for whoever asked.",
      )
      .optional(),
    /**0: declarative (a recipe or prompt body). 1: Deno code.*/
    tier: z
      .union([z.literal(0), z.literal(1)])
      .describe("0: declarative (a recipe or prompt body). 1: Deno code."),
    /**The smoke test entry, run at install, update, and on a schedule (lib/smoke.ts). `kind: "static"` (loads only), `"recipe_fixture"` + `fixture` (a Tier 0 plugin's own recipe run against a fixture-seeded HostEmulator), or `"deno_test"` (Tier 1, session-d step 5).*/
    smoke: z
      .object({
        kind: z.enum(["static", "recipe_fixture", "deno_test"]),
        /**Path, relative to the package's own directory, to its smoke fixture. Required when kind is "recipe_fixture".*/
        fixture: z
          .string()
          .min(1)
          .describe(
            'Path, relative to the package\'s own directory, to its smoke fixture. Required when kind is "recipe_fixture".',
          )
          .optional(),
      })
      .catchall(z.any())
      .describe(
        'The smoke test entry, run at install, update, and on a schedule (lib/smoke.ts). `kind: "static"` (loads only), `"recipe_fixture"` + `fixture` (a Tier 0 plugin\'s own recipe run against a fixture-seeded HostEmulator), or `"deno_test"` (Tier 1, session-d step 5).',
      )
      .optional(),
    /**wave-2.md's C-to-D contract: typed read queries a package offers beyond its own recipe, for C's Tier 2 tool-calling router to call directly rather than routing a whole turn through this package's `handle`.*/
    exposes: z
      .object({
        queries: z
          .array(
            z
              .object({
                id: z.string().min(1),
                description: z.string().min(1).max(200),
                /**A JSON Schema for this query's arguments.*/
                args: z
                  .any()
                  .describe("A JSON Schema for this query's arguments."),
                /**A JSON Schema for this query's result.*/
                returns: z
                  .any()
                  .describe("A JSON Schema for this query's result."),
              })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .describe(
        "wave-2.md's C-to-D contract: typed read queries a package offers beyond its own recipe, for C's Tier 2 tool-calling router to call directly rather than routing a whole turn through this package's `handle`.",
      )
      .optional(),
    quality_scale: z.enum(["bronze", "silver", "gold"]).optional(),
    /**The release channel this manifest version was published under (session-d step 6's store). A household's own per-package channel *choice* is store-side state, not this field - this is the publisher's declaration of what the version itself is.*/
    channel: z
      .enum(["stable", "beta"])
      .describe(
        "The release channel this manifest version was published under (session-d step 6's store). A household's own per-package channel *choice* is store-side state, not this field - this is the publisher's declaration of what the version itself is.",
      )
      .default("stable"),
    content_sha256: z.string().regex(new RegExp("^[a-f0-9]{64}$")).optional(),
    signature: z.string().optional(),
    signer: z.string().optional(),
    /**For a package that graduated to its own repo (5.1).*/
    source: z
      .object({
        repo: z.string().optional(),
        ref: z.string().optional(),
        sha: z.string().optional(),
      })
      .strict()
      .describe("For a package that graduated to its own repo (5.1).")
      .optional(),
  })
  .strict()
  .describe(
    "One manifest format for every package kind (plugin, skill, app, companion, integration, model, wakeword, voice, theme, module). See platform plan 5.1 and .github's docs/PACKAGES.md.",
  );
export type PackageManifest = z.infer<typeof PackageManifest>;
