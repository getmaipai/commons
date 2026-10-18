// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/news-search-recent.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**NEWS-LOOK-02. One search a person ran in the News app, kept so the Search page can offer it again. Person scope: never readable by another person or an admin page. Never created for a child: a child's search keeps no recents. The schema carries no age band, so that rule cannot be enforced here; `validateNewsSearchRecent` in spec/records/ts/validate.ts takes the owner's band from the caller and rejects a child's row, and the hub writes through it.*/
export const NewsSearchRecent = z
  .object({
    id: z.string().regex(new RegExp("^recent-[a-z0-9]{6,}$")),
    person_id: z.string().min(1),
    q: z.string().min(1).max(120),
    at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    provenance: z.string().min(1),
    source: z.literal("hub"),
  })
  .strict()
  .describe(
    "NEWS-LOOK-02. One search a person ran in the News app, kept so the Search page can offer it again. Person scope: never readable by another person or an admin page. Never created for a child: a child's search keeps no recents. The schema carries no age band, so that rule cannot be enforced here; `validateNewsSearchRecent` in spec/records/ts/validate.ts takes the owner's band from the caller and rejects a child's row, and the hub writes through it.",
  );
export type NewsSearchRecent = z.infer<typeof NewsSearchRecent>;
