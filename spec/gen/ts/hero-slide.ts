// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/hero-slide.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One slide shown in the setup wait carousel and in What Home can do.*/
export const HeroSlide = z
  .object({
    id: z.string().regex(new RegExp("^hero\\.[a-z][a-z0-9-]*$")),
    /**A file name from brand/, bundled at build time.*/
    image: z
      .string()
      .min(1)
      .describe("A file name from brand/, bundled at build time."),
    heading: z.string().min(1),
    /**A COPY.md key resolved at build time.*/
    copy_ref: z
      .string()
      .min(1)
      .describe("A COPY.md key resolved at build time.")
      .optional(),
    /**Proposed copy; present only when copy_source is proposed.*/
    text: z
      .string()
      .min(1)
      .describe("Proposed copy; present only when copy_source is proposed.")
      .optional(),
    /**Origin of the slide text: a COPY.md key, a document, or proposed copy.*/
    copy_source: z
      .string()
      .regex(
        new RegExp("^(copy:[a-z][a-z0-9_-]*|doc:[A-Za-z0-9._/-]+|proposed)$"),
      )
      .describe(
        "Origin of the slide text: a COPY.md key, a document, or proposed copy.",
      ),
    teaches: z.string().min(1),
    audience: z.enum(["all", "adult", "admin"]),
    available_when: z.string().min(1).optional(),
    order: z.number().int().gte(0),
  })
  .strict()
  .and(z.intersection(z.any(), z.intersection(z.any(), z.any())))
  .describe(
    "One slide shown in the setup wait carousel and in What Home can do.",
  );
export type HeroSlide = z.infer<typeof HeroSlide>;
