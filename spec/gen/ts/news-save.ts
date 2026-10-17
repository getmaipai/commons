// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/news-save.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**NEWS-00. One story a person saved. Person scope. A saved item's article text and picture are exempt from the shelf prune while the save exists. `offline` is true once the text and the picture are cached.*/
export const NewsSave = z
  .object({
    id: z.string().regex(new RegExp("^save-[a-z0-9]{6,}$")),
    person_id: z.string().min(1),
    item_id: z.string().regex(new RegExp("^news-[a-z0-9]{6,}$")),
    story_id: z.string().regex(new RegExp("^story-[a-z0-9]{6,}$")),
    canonical_url: z.string().url(),
    title: z.string().min(1),
    publisher: z.string().min(1),
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
    "NEWS-00. One story a person saved. Person scope. A saved item's article text and picture are exempt from the shelf prune while the save exists. `offline` is true once the text and the picture are cached.",
  );
export type NewsSave = z.infer<typeof NewsSave>;
