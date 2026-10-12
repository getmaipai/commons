// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/topic-copy.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The sentences a child's or teen's topic block is made of (MINOR-TOPICS-01), declared once so the hub and the robot render the same text. One header per band (kindness, the hard lines, the danger carve-out), one line per family, band and stance, and the family-story line. Positive wording only: each line says how to answer, never to refuse a subject. The stances a household may pick come from the content-ceiling records, never from this file.*/
export const TopicCopy = z
  .object({
    /**The review month of this copy, such as 2026.10.*/
    version: z
      .string()
      .min(1)
      .describe("The review month of this copy, such as 2026.10."),
    /**The emergency number used when the household has no locale number; replaces {emergency}.*/
    emergency_default: z
      .string()
      .min(1)
      .describe(
        "The emergency number used when the household has no locale number; replaces {emergency}.",
      ),
    header: z
      .object({ child: z.string().min(1), teen: z.string().min(1) })
      .strict(),
    families: z
      .object({
        bodies: z
          .object({
            child: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
            teen: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
          })
          .strict(),
        health: z
          .object({
            child: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
            teen: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
          })
          .strict(),
        feelings: z
          .object({
            child: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
            teen: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
          })
          .strict(),
        risk: z
          .object({
            child: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
            teen: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
          })
          .strict(),
        violence: z
          .object({
            child: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
            teen: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
          })
          .strict(),
        people: z
          .object({
            child: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
            teen: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
          })
          .strict(),
        beliefs: z
          .object({
            child: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
            teen: z
              .object({
                informative: z.string().min(1).optional(),
                gentle: z.string().min(1).optional(),
                redirect: z.string().min(1).optional(),
                support: z.string().min(1).optional(),
                protect: z.string().min(1).optional(),
                neutral: z.string().min(1).optional(),
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    family_stories: z
      .object({
        /**Child band only. {names} is replaced by the comma-separated story names.*/
        line: z
          .string()
          .min(1)
          .describe(
            "Child band only. {names} is replaced by the comma-separated story names.",
          ),
      })
      .strict(),
  })
  .strict()
  .describe(
    "The sentences a child's or teen's topic block is made of (MINOR-TOPICS-01), declared once so the hub and the robot render the same text. One header per band (kindness, the hard lines, the danger carve-out), one line per family, band and stance, and the family-story line. Positive wording only: each line says how to answer, never to refuse a subject. The stances a household may pick come from the content-ceiling records, never from this file.",
  );
export type TopicCopy = z.infer<typeof TopicCopy>;
