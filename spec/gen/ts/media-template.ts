// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-template.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MEDIA-01. A reusable picture or video prompt skeleton. Blanks are filled when a creation is made; references are Library file ids. CREATOR-01: kind "fragment" is a short English prompt fragment (a camera, lens, light, grade and so on, in `prompt`, with its `group`) that the shot-card chips and the prompt builder read; it is not a template a person starts from. Reader rule: every template reader (the template list, the Create and Studio template pickers, the check.sh template validation) MUST skip fragment records, and only the fragment readers read them. TEMPLATE-02: a template a person saved carries owner_person_id (private unless shared_with is "household"), a content_rating stamp (the shared content-rating shape, copied here as a local definition like the other records) and an audience set from it by the Home side (X means adult-only, anything else all-ages); its cast is stored as cast_* blanks in the prompt only: references and styles stay empty and no model id is stored (the record is closed).*/
export const MediaTemplate = z
  .object({
    id: z.string().regex(new RegExp("^mtpl-[a-z0-9]{6,}$")),
    kind: z.enum(["picture", "video", "fragment"]),
    /**CREATOR-01. Which vocabulary a fragment belongs to: the shot-card groups, or the picture presets picture_look, relight, angle and format (CREATOR-13). Required when kind is fragment; absent otherwise.*/
    group: z
      .enum([
        "camera",
        "lens",
        "focal",
        "aperture",
        "framing",
        "light",
        "film_stock",
        "look",
        "grade",
        "picture_look",
        "relight",
        "angle",
        "format",
      ])
      .describe(
        "CREATOR-01. Which vocabulary a fragment belongs to: the shot-card groups, or the picture presets picture_look, relight, angle and format (CREATOR-13). Required when kind is fragment; absent otherwise.",
      )
      .optional(),
    title: z.string().min(1).max(120),
    summary: z.string().max(500).default(""),
    /**A category id from vocab/media-template-categories.json.*/
    category: z
      .string()
      .min(1)
      .max(60)
      .describe("A category id from vocab/media-template-categories.json."),
    /**Strictest intended audience wins.*/
    audience: z
      .enum(["all-ages", "adult-only"])
      .describe("Strictest intended audience wins."),
    /**TEMPLATE-02. The one person who saved this template. Absent on a bundled template. A saved template is private to its owner unless shared_with says otherwise.*/
    owner_person_id: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe(
        "TEMPLATE-02. The one person who saved this template. Absent on a bundled template. A saved template is private to its owner unless shared_with says otherwise.",
      )
      .optional(),
    /**TEMPLATE-02. Who else may use this saved template: the literal "household" (the same value the share record uses). Absent means private to owner_person_id.*/
    shared_with: z
      .literal("household")
      .describe(
        'TEMPLATE-02. Who else may use this saved template: the literal "household" (the same value the share record uses). Absent means private to owner_person_id.',
      )
      .optional(),
    /**The one stamp every rated item and result carries. It sits beside content-ceiling.schema.json, which governs the register of a generated reply per band and is unchanged. A viewer's ceiling is a rank from 0 to 4 in Home's design.*/
    content_rating: z
      .object({
        level: z.enum(["G", "PG", "PG-13", "R", "X", "Prohibited", "Unrated"]),
        /**given means an outside label such as a film rating, explicit flag, or site list; declared means the feature that made the content says what it can only make; worked_out means one of our own raters decided.*/
        source: z
          .enum(["given", "declared", "worked_out"])
          .describe(
            "given means an outside label such as a film rating, explicit flag, or site list; declared means the feature that made the content says what it can only make; worked_out means one of our own raters decided.",
          ),
        /**The rater id.*/
        rater: z
          .string()
          .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
          .describe("The rater id."),
        rater_version: z.number().int().gte(1),
        rated_at: z.string().datetime({ offset: true }),
        /**The first six are Home's content-policy protection kinds; scary and self_harm come from the design note.*/
        reasons: z
          .array(
            z.enum([
              "swearing",
              "drugs",
              "gambling",
              "gore",
              "sexual",
              "minor_line",
              "scary",
              "self_harm",
            ]),
          )
          .refine(
            (arr) => arr.every((item, i) => arr.indexOf(item) == i),
            "All items must be unique!",
          )
          .describe(
            "The first six are Home's content-policy protection kinds; scary and self_harm come from the design note.",
          )
          .optional(),
        /**The outside label this stamp was mapped from.*/
        label: z
          .object({ system: z.string().min(1), value: z.string().min(1) })
          .strict()
          .describe("The outside label this stamp was mapped from.")
          .optional(),
      })
      .strict()
      .describe(
        "The one stamp every rated item and result carries. It sits beside content-ceiling.schema.json, which governs the register of a generated reply per band and is unchanged. A viewer's ceiling is a rank from 0 to 4 in Home's design.",
      )
      .optional(),
    /**Prompt skeleton with named blanks in braces.*/
    prompt: z
      .string()
      .min(1)
      .max(10000)
      .describe("Prompt skeleton with named blanks in braces."),
    /**Library file ids only.*/
    references: z
      .array(z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")))
      .max(20)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe("Library file ids only.")
      .default([]),
    styles: z
      .array(z.string().regex(new RegExp("^lora-[a-z0-9]{6,}$")))
      .max(20)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .default([]),
    aspect: z
      .union([
        z.literal("1:1"),
        z.literal("3:2"),
        z.literal("2:3"),
        z.literal("16:9"),
        z.literal("9:16"),
        z.literal(null),
      ])
      .default(null),
    transparent: z.boolean().default(false),
    provenance: z.string().min(1),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe(
    'MEDIA-01. A reusable picture or video prompt skeleton. Blanks are filled when a creation is made; references are Library file ids. CREATOR-01: kind "fragment" is a short English prompt fragment (a camera, lens, light, grade and so on, in `prompt`, with its `group`) that the shot-card chips and the prompt builder read; it is not a template a person starts from. Reader rule: every template reader (the template list, the Create and Studio template pickers, the check.sh template validation) MUST skip fragment records, and only the fragment readers read them. TEMPLATE-02: a template a person saved carries owner_person_id (private unless shared_with is "household"), a content_rating stamp (the shared content-rating shape, copied here as a local definition like the other records) and an audience set from it by the Home side (X means adult-only, anything else all-ages); its cast is stored as cast_* blanks in the prompt only: references and styles stay empty and no model id is stored (the record is closed).',
  );
export type MediaTemplate = z.infer<typeof MediaTemplate>;
