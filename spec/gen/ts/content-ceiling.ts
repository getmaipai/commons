// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/content-ceiling.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**How explicit a generated reply may be for one age band (session-c-brain-and-voice.md step 7). One record per band (child, teen, adult) - not a per-household custom profile yet (that authoring UI is future, deferred work, docs/BACKLOG.md's own 'nine sliders' entry). Governs REGISTER only: how graphic, how frank, how unfiltered a reply's own generated content may be. It is a completely separate, additive concern from spec/safety/ts/classifier.ts's own hard refuse/allow_with_resources categories (self_harm, harmful_request, csam, credible_threat, grooming, pii_extraction, prompt_injection, jailbreak) - checkSafety() never reads a ceiling and never will; `floor` below documents that invariant, it does not implement it. There is no 'unrestricted' band today: reaching past the adult ceiling needs a one-time signed adult acknowledgment (a Grant, session-f-platform-and-trust.md step 7, not yet built) this record does not yet gate - safe-by-default in the meantime, since nothing can set a ceiling higher than what ships here. `topics` (MINOR-TOPICS-01) governs stance, whether and how a subject is engaged; `dials` govern explicitness. A household setting may only choose within a band's `allowed` range, and a `fixed` family takes no setting. Adult records carry no `topics`.*/
export const ContentCeiling = z
  .object({
    /**Matches turnEngine.ts's own AgeBand type exactly (birthdate-derived, falling back to role) - one record per value, never a custom slug.*/
    band: z
      .enum(["child", "teen", "adult"])
      .describe(
        "Matches turnEngine.ts's own AgeBand type exactly (birthdate-derived, falling back to role) - one record per value, never a custom slug.",
      ),
    /**Per-category register ceilings, the architecture docs/dev.md's own redesign table names as sound and worth reusing (home-legacy.git's lib/contentPolicy.ts) - each dial's value is this band's MAXIMUM for that category, a household setting may only lower it further, never raise it past what's recorded here.*/
    dials: z
      .object({
        profanity: z.enum(["off", "mild", "unrestricted"]),
        sexual: z.enum(["off", "suggestive", "unrestricted"]),
        violence: z.enum(["off", "moderate", "unrestricted"]),
        substances: z.enum(["off", "discuss", "unrestricted"]),
        crime: z.enum(["off", "discuss", "unrestricted"]),
        hate: z.enum(["off", "fiction", "unrestricted"]),
        self_harm: z.enum(["off", "discuss", "unrestricted"]),
        privacy: z.enum(["off", "public", "unrestricted"]),
      })
      .strict()
      .describe(
        "Per-category register ceilings, the architecture docs/dev.md's own redesign table names as sound and worth reusing (home-legacy.git's lib/contentPolicy.ts) - each dial's value is this band's MAXIMUM for that category, a household setting may only lower it further, never raise it past what's recorded here.",
      ),
    /**Documentation, not enforcement: the classifier's own hard-refuse category names (spec/schemas/safety-result.schema.json's own enum, minus self_harm which is allow_with_resources, never refuse) that no dial value on ANY band, including a future unrestricted one, can ever reach - checkSafety() enforces this unconditionally in code, before any ceiling is ever consulted. Every band's record carries the IDENTICAL array (a fixture/test asserts this); it exists here so a generated binding can display the floor beside the dials it sits under, not to make it configurable.*/
    floor: z
      .array(
        z.enum([
          "harmful_request",
          "credible_threat",
          "csam",
          "grooming",
          "pii_extraction",
          "prompt_injection",
          "jailbreak",
        ]),
      )
      .min(1)
      .describe(
        "Documentation, not enforcement: the classifier's own hard-refuse category names (spec/schemas/safety-result.schema.json's own enum, minus self_harm which is allow_with_resources, never refuse) that no dial value on ANY band, including a future unrestricted one, can ever reach - checkSafety() enforces this unconditionally in code, before any ceiling is ever consulted. Every band's record carries the IDENTICAL array (a fixture/test asserts this); it exists here so a generated binding can display the floor beside the dials it sits under, not to make it configurable.",
      ),
    /**Per-family stance record for a child or teen band (seven families, spec/safety/topic-copy.json holds the sentences the model reads). Absent on the adult record, so an adult's prompt is unchanged.*/
    topics: z
      .object({
        bodies: z
          .object({
            /**The band's default stance for this family.*/
            stance: z
              .enum([
                "informative",
                "gentle",
                "redirect",
                "support",
                "protect",
                "neutral",
              ])
              .describe("The band's default stance for this family."),
            /**The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.*/
            allowed: z
              .array(
                z.enum([
                  "informative",
                  "gentle",
                  "redirect",
                  "support",
                  "protect",
                  "neutral",
                ]),
              )
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.",
              ),
            /**True when no setting in any scope reaches this family.*/
            fixed: z
              .boolean()
              .describe(
                "True when no setting in any scope reaches this family.",
              ),
          })
          .strict(),
        health: z
          .object({
            /**The band's default stance for this family.*/
            stance: z
              .enum([
                "informative",
                "gentle",
                "redirect",
                "support",
                "protect",
                "neutral",
              ])
              .describe("The band's default stance for this family."),
            /**The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.*/
            allowed: z
              .array(
                z.enum([
                  "informative",
                  "gentle",
                  "redirect",
                  "support",
                  "protect",
                  "neutral",
                ]),
              )
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.",
              ),
            /**True when no setting in any scope reaches this family.*/
            fixed: z
              .boolean()
              .describe(
                "True when no setting in any scope reaches this family.",
              ),
          })
          .strict(),
        feelings: z
          .object({
            /**The band's default stance for this family.*/
            stance: z
              .enum([
                "informative",
                "gentle",
                "redirect",
                "support",
                "protect",
                "neutral",
              ])
              .describe("The band's default stance for this family."),
            /**The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.*/
            allowed: z
              .array(
                z.enum([
                  "informative",
                  "gentle",
                  "redirect",
                  "support",
                  "protect",
                  "neutral",
                ]),
              )
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.",
              ),
            /**True when no setting in any scope reaches this family.*/
            fixed: z
              .boolean()
              .describe(
                "True when no setting in any scope reaches this family.",
              ),
          })
          .strict(),
        risk: z
          .object({
            /**The band's default stance for this family.*/
            stance: z
              .enum([
                "informative",
                "gentle",
                "redirect",
                "support",
                "protect",
                "neutral",
              ])
              .describe("The band's default stance for this family."),
            /**The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.*/
            allowed: z
              .array(
                z.enum([
                  "informative",
                  "gentle",
                  "redirect",
                  "support",
                  "protect",
                  "neutral",
                ]),
              )
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.",
              ),
            /**True when no setting in any scope reaches this family.*/
            fixed: z
              .boolean()
              .describe(
                "True when no setting in any scope reaches this family.",
              ),
          })
          .strict(),
        violence: z
          .object({
            /**The band's default stance for this family.*/
            stance: z
              .enum([
                "informative",
                "gentle",
                "redirect",
                "support",
                "protect",
                "neutral",
              ])
              .describe("The band's default stance for this family."),
            /**The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.*/
            allowed: z
              .array(
                z.enum([
                  "informative",
                  "gentle",
                  "redirect",
                  "support",
                  "protect",
                  "neutral",
                ]),
              )
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.",
              ),
            /**True when no setting in any scope reaches this family.*/
            fixed: z
              .boolean()
              .describe(
                "True when no setting in any scope reaches this family.",
              ),
          })
          .strict(),
        people: z
          .object({
            /**The band's default stance for this family.*/
            stance: z
              .enum([
                "informative",
                "gentle",
                "redirect",
                "support",
                "protect",
                "neutral",
              ])
              .describe("The band's default stance for this family."),
            /**The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.*/
            allowed: z
              .array(
                z.enum([
                  "informative",
                  "gentle",
                  "redirect",
                  "support",
                  "protect",
                  "neutral",
                ]),
              )
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.",
              ),
            /**True when no setting in any scope reaches this family.*/
            fixed: z
              .boolean()
              .describe(
                "True when no setting in any scope reaches this family.",
              ),
          })
          .strict(),
        beliefs: z
          .object({
            /**The band's default stance for this family.*/
            stance: z
              .enum([
                "informative",
                "gentle",
                "redirect",
                "support",
                "protect",
                "neutral",
              ])
              .describe("The band's default stance for this family."),
            /**The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.*/
            allowed: z
              .array(
                z.enum([
                  "informative",
                  "gentle",
                  "redirect",
                  "support",
                  "protect",
                  "neutral",
                ]),
              )
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "The stances a household setting may choose for this family at this band; always contains `stance`. A fixed family allows exactly its one stance.",
              ),
            /**True when no setting in any scope reaches this family.*/
            fixed: z
              .boolean()
              .describe(
                "True when no setting in any scope reaches this family.",
              ),
          })
          .strict(),
      })
      .strict()
      .describe(
        "Per-family stance record for a child or teen band (seven families, spec/safety/topic-copy.json holds the sentences the model reads). Absent on the adult record, so an adult's prompt is unchanged.",
      )
      .optional(),
    /**Child band only: whether Santa Claus, the Tooth Fairy and similar stories are kept (never confirmed or denied). A parent can switch it off per child.*/
    family_stories: z
      .object({
        default: z.enum(["keep", "off"]),
        /**The built-in story names; a parent may add more.*/
        names: z
          .array(z.string().min(1))
          .min(1)
          .describe("The built-in story names; a parent may add more."),
      })
      .strict()
      .describe(
        "Child band only: whether Santa Claus, the Tooth Fairy and similar stories are kept (never confirmed or denied). A parent can switch it off per child.",
      )
      .optional(),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .and(z.intersection(z.any(), z.any()))
  .describe(
    "How explicit a generated reply may be for one age band (session-c-brain-and-voice.md step 7). One record per band (child, teen, adult) - not a per-household custom profile yet (that authoring UI is future, deferred work, docs/BACKLOG.md's own 'nine sliders' entry). Governs REGISTER only: how graphic, how frank, how unfiltered a reply's own generated content may be. It is a completely separate, additive concern from spec/safety/ts/classifier.ts's own hard refuse/allow_with_resources categories (self_harm, harmful_request, csam, credible_threat, grooming, pii_extraction, prompt_injection, jailbreak) - checkSafety() never reads a ceiling and never will; `floor` below documents that invariant, it does not implement it. There is no 'unrestricted' band today: reaching past the adult ceiling needs a one-time signed adult acknowledgment (a Grant, session-f-platform-and-trust.md step 7, not yet built) this record does not yet gate - safe-by-default in the meantime, since nothing can set a ceiling higher than what ships here. `topics` (MINOR-TOPICS-01) governs stance, whether and how a subject is engaged; `dials` govern explicitness. A household setting may only choose within a band's `allowed` range, and a `fixed` family takes no setting. Adult records carry no `topics`.",
  );
export type ContentCeiling = z.infer<typeof ContentCeiling>;
