// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-template.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MEDIA-01. A reusable picture or video prompt skeleton. Blanks are filled when a creation is made; references are Library file ids. CREATOR-01: kind "fragment" is a short English prompt fragment (a camera, lens, light, grade and so on, in `prompt`, with its `group`) that the shot-card chips and the prompt builder read; it is not a template a person starts from. Reader rule: every template reader (the template list, the Create and Studio template pickers, the check.sh template validation) MUST skip fragment records, and only the fragment readers read them.*/
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
    'MEDIA-01. A reusable picture or video prompt skeleton. Blanks are filled when a creation is made; references are Library file ids. CREATOR-01: kind "fragment" is a short English prompt fragment (a camera, lens, light, grade and so on, in `prompt`, with its `group`) that the shot-card chips and the prompt builder read; it is not a template a person starts from. Reader rule: every template reader (the template list, the Create and Studio template pickers, the check.sh template validation) MUST skip fragment records, and only the fragment readers read them.',
  );
export type MediaTemplate = z.infer<typeof MediaTemplate>;
