// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/news-read.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**NEWS-00. One time a person opened a story. Person scope; pruned at 90 days; feeds the affinity only and is shown nowhere but the person's own dimmed cards. `read_s` is also the Listen resume point. `finished` is true after scrolling past 80 percent or when Listen reached the end. `feedback` is the person's own More or Less like this.*/
export const NewsRead = z
  .object({
    id: z.string().regex(new RegExp("^read-[a-z0-9]{6,}$")),
    person_id: z.string().min(1),
    item_id: z.string().regex(new RegExp("^news-[a-z0-9]{6,}$")),
    story_id: z.string().regex(new RegExp("^story-[a-z0-9]{6,}$")),
    opened_at: z.string().datetime({ offset: true }),
    read_s: z.number().int().gte(0),
    finished: z.boolean(),
    feedback: z
      .union([z.literal("more"), z.literal("less"), z.literal(null)])
      .optional(),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    provenance: z.string().min(1),
  })
  .strict()
  .describe(
    "NEWS-00. One time a person opened a story. Person scope; pruned at 90 days; feeds the affinity only and is shown nowhere but the person's own dimmed cards. `read_s` is also the Listen resume point. `finished` is true after scrolling past 80 percent or when Listen reached the end. `feedback` is the person's own More or Less like this.",
  );
export type NewsRead = z.infer<typeof NewsRead>;
