// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/news-item.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One canonical item ingested from a household news feed.*/
export const NewsItem = z
  .object({
    id: z.string().regex(new RegExp("^news-[a-z0-9]{6,}$")),
    feed_id: z.string().regex(new RegExp("^feed-[a-z0-9]{6,}$")),
    url: z.string().url(),
    canonical_url: z.string().url(),
    title: z.string().min(1),
    summary: z.string(),
    published_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .optional(),
    fetched_at: z.string().datetime({ offset: true }),
    publisher: z.string().min(1),
    lang: z.string().min(2),
    story_id: z.string().regex(new RegExp("^story-[a-z0-9]{6,}$")).optional(),
    body_cached_until: z.string().datetime({ offset: true }).optional(),
    band_ok: z.enum(["child", "teen", "adult"]),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
    provenance: z.string().min(1),
  })
  .strict()
  .describe("One canonical item ingested from a household news feed.");
export type NewsItem = z.infer<typeof NewsItem>;
