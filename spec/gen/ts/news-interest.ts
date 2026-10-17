// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/news-interest.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**NEWS-00. One person's standing with one News channel (a topic or a source): whether they follow it, and a computed affinity from their own reads. Person scope: never readable by another person or an admin page, cleared by Reset My Mix (inferred rows) or Unfollow, removed by the person's forget rule. `inferred` is true when only the affinity holds the row; a child never has an inferred row (nothing is inferred about a child), which the cross-field rule in spec/records/ts/validate.ts (`validateNewsInterest`) enforces because JSON Schema cannot.*/
export const NewsInterest = z
  .object({
    id: z.string().regex(new RegExp("^interest-[a-z0-9]{6,}$")),
    person_id: z.string().min(1),
    kind: z.enum(["topic", "source"]),
    /**A topic id (spec/news/topics.json) or a `feed-` id.*/
    key: z
      .string()
      .min(1)
      .describe("A topic id (spec/news/topics.json) or a `feed-` id."),
    /**The person's own tap.*/
    followed: z.boolean().describe("The person's own tap."),
    /**Computed on the hub from the person's own reads; 0 for a row that holds only a follow.*/
    affinity: z
      .number()
      .gte(0)
      .lte(1)
      .describe(
        "Computed on the hub from the person's own reads; 0 for a row that holds only a follow.",
      ),
    inferred: z.boolean(),
    updated_at: z.string().datetime({ offset: true }),
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
    "NEWS-00. One person's standing with one News channel (a topic or a source): whether they follow it, and a computed affinity from their own reads. Person scope: never readable by another person or an admin page, cleared by Reset My Mix (inferred rows) or Unfollow, removed by the person's forget rule. `inferred` is true when only the affinity holds the row; a child never has an inferred row (nothing is inferred about a child), which the cross-field rule in spec/records/ts/validate.ts (`validateNewsInterest`) enforces because JSON Schema cannot.",
  );
export type NewsInterest = z.infer<typeof NewsInterest>;
