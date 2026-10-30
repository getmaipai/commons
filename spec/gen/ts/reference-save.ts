// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/reference-save.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**READER-05. One reference article (a Wikipedia or other Kiwix book page) a person saved. Person scope. A person has at most one save per book and path. `offline` is true once the article text and pictures are kept on this device.*/
export const ReferenceSave = z
  .object({
    id: z.string().regex(new RegExp("^refsave-[a-z0-9]{6,}$")),
    person_id: z.string().min(1),
    /**The installed book's id, as the reference routes name it.*/
    book: z
      .string()
      .min(1)
      .describe("The installed book's id, as the reference routes name it."),
    /**The article path inside the book, unencoded.*/
    path: z
      .string()
      .min(1)
      .describe("The article path inside the book, unencoded."),
    title: z.string().min(1),
    saved_at: z.string().datetime({ offset: true }),
    offline: z.boolean(),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    provenance: z.string().min(1),
  })
  .strict()
  .describe(
    "READER-05. One reference article (a Wikipedia or other Kiwix book page) a person saved. Person scope. A person has at most one save per book and path. `offline` is true once the article text and pictures are kept on this device.",
  );
export type ReferenceSave = z.infer<typeof ReferenceSave>;
