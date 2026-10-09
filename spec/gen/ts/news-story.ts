// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/news-story.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A cluster of related news items from independent publishers.*/
export const NewsStory = z
  .object({
    id: z.string().regex(new RegExp("^story-[a-z0-9]{6,}$")),
    title: z.string().min(1),
    first_seen: z.string().datetime({ offset: true }),
    last_seen: z.string().datetime({ offset: true }),
    item_count: z.number().int().gte(1),
    publisher_count: z.number().int().gte(1),
    entities: z.array(z.string().min(1)),
    pageviews_hint: z.number().gte(0).optional(),
    centroid_ref: z.string().min(1),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe("A cluster of related news items from independent publishers.");
export type NewsStory = z.infer<typeof NewsStory>;
