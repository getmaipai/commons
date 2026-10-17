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
    /**NEWS-00. Topic ids from spec/news/topics.json; empty when the classifier is unsure.*/
    topics: z
      .array(z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "NEWS-00. Topic ids from spec/news/topics.json; empty when the classifier is unsure.",
      )
      .optional(),
    /**NEWS-00. The picture address the feed itself named (media:content, media:thumbnail, an image enclosure or the first picture in the feed's own content), never one read from a fetched page. Fetched only when a screen shows the story.*/
    image_url: z
      .string()
      .url()
      .describe(
        "NEWS-00. The picture address the feed itself named (media:content, media:thumbnail, an image enclosure or the first picture in the feed's own content), never one read from a fetched page. Fetched only when a screen shows the story.",
      )
      .optional(),
    /**NEWS-00. The picture cache key once a screen asked for it; null until then.*/
    image_ref: z
      .union([
        z
          .string()
          .describe(
            "NEWS-00. The picture cache key once a screen asked for it; null until then.",
          ),
        z
          .null()
          .describe(
            "NEWS-00. The picture cache key once a screen asked for it; null until then.",
          ),
      ])
      .describe(
        "NEWS-00. The picture cache key once a screen asked for it; null until then.",
      )
      .optional(),
    /**NEWS-00. The cached article block list in the knowledge store; null until needed.*/
    content_ref: z
      .union([
        z
          .string()
          .describe(
            "NEWS-00. The cached article block list in the knowledge store; null until needed.",
          ),
        z
          .null()
          .describe(
            "NEWS-00. The cached article block list in the knowledge store; null until needed.",
          ),
      ])
      .describe(
        "NEWS-00. The cached article block list in the knowledge store; null until needed.",
      )
      .optional(),
    /**NEWS-00. Where the article text came from: the feed's own text, one fetch of the page, an archived copy, or only the feed's teaser.*/
    content_source: z
      .enum(["feed", "fetched", "archived", "teaser"])
      .describe(
        "NEWS-00. Where the article text came from: the feed's own text, one fetch of the page, an archived copy, or only the feed's teaser.",
      )
      .optional(),
    /**NEWS-00. Estimated reading time in seconds, from the text.*/
    reading_s: z
      .number()
      .int()
      .gte(0)
      .describe("NEWS-00. Estimated reading time in seconds, from the text.")
      .optional(),
    author: z.string().min(1).optional(),
    body_cached_until: z.string().datetime({ offset: true }).optional(),
    band_ok: z.enum(["child", "teen", "adult"]),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
    provenance: z.string().min(1),
  })
  .strict()
  .describe("One canonical item ingested from a household news feed.");
export type NewsItem = z.infer<typeof NewsItem>;
