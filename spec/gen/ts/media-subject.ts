// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-subject.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MEDIA-01. A saved character, prop or place for consistent use in media. Sharing is private unless explicitly granted to named people. Real people are labelled; subject_age_band is deliberately absent.*/
export const MediaSubject = z
  .object({
    id: z.string().regex(new RegExp("^msub-[a-z0-9]{6,}$")),
    name: z.string().min(1).max(120),
    kind: z.enum(["character", "prop", "place"]),
    owner_person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    /**Private to owner unless explicitly shared to these named people.*/
    shared_to: z
      .array(z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "Private to owner unless explicitly shared to these named people.",
      )
      .default([]),
    look_words: z.array(z.string().min(1).max(80)).min(1).max(30),
    /**Approved Library picture file ids only; never paths.*/
    reference_file_ids: z
      .array(z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")))
      .max(20)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe("Approved Library picture file ids only; never paths.")
      .default([]),
    voice: z.union([z.string().max(500), z.null()]).default(null),
    /**Label that the subject represents a real person or place when applicable.*/
    real: z
      .boolean()
      .describe(
        "Label that the subject represents a real person or place when applicable.",
      )
      .default(false),
    trained_style_id: z
      .union([z.string().regex(new RegExp("^lora-[a-z0-9]{6,}$")), z.null()])
      .default(null),
    provenance: z.string().min(1),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe(
    "MEDIA-01. A saved character, prop or place for consistent use in media. Sharing is private unless explicitly granted to named people. Real people are labelled; subject_age_band is deliberately absent.",
  );
export type MediaSubject = z.infer<typeof MediaSubject>;
