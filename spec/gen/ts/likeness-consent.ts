// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/likeness-consent.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**LIKENESS-01. One change to a household adult's consent about their own likeness, appended each time the person switches one of the two consent settings (likeness.adults, likeness.adult_content) on or off. The settings hold the current value; this record is the history: who agreed to what, and when. Only the person themselves writes it, from their own settings, and only an adult. Records are never edited or deleted.*/
export const LikenessConsent = z
  .object({
    id: z.string().min(1),
    /**The person whose likeness this is (the subject), who made the change.*/
    person_id: z
      .string()
      .min(1)
      .describe(
        "The person whose likeness this is (the subject), who made the change.",
      ),
    /**adults: other adults here may make pictures, videos and styles that look like this person. adult_content: and may include adult content (only meaningful while adults is on).*/
    option: z
      .enum(["adults", "adult_content"])
      .describe(
        "adults: other adults here may make pictures, videos and styles that look like this person. adult_content: and may include adult content (only meaningful while adults is on).",
      ),
    state: z.enum(["on", "off"]),
    /**How the change was made; this is the record provenance. Only the person's own settings page writes it.*/
    source: z
      .literal("settings")
      .describe(
        "How the change was made; this is the record provenance. Only the person's own settings page writes it.",
      ),
    changed_at: z.string().datetime({ offset: true }),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
  })
  .strict()
  .describe(
    "LIKENESS-01. One change to a household adult's consent about their own likeness, appended each time the person switches one of the two consent settings (likeness.adults, likeness.adult_content) on or off. The settings hold the current value; this record is the history: who agreed to what, and when. Only the person themselves writes it, from their own settings, and only an adult. Records are never edited or deleted.",
  );
export type LikenessConsent = z.infer<typeof LikenessConsent>;
