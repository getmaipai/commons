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
    /**NEWS-00. The item the hero shows: the earliest from the publisher with the most items, with a picture when any item has one.*/
    lead_item_id: z
      .string()
      .regex(new RegExp("^news-[a-z0-9]{6,}$"))
      .describe(
        "NEWS-00. The item the hero shows: the earliest from the publisher with the most items, with a picture when any item has one.",
      )
      .optional(),
    /**NEWS-00. The union of its items' topics.*/
    topics: z
      .array(z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe("NEWS-00. The union of its items' topics.")
      .optional(),
    /**NEWS-00. The lead item's picture cache key; null until a screen asked for it.*/
    image_ref: z
      .union([
        z
          .string()
          .describe(
            "NEWS-00. The lead item's picture cache key; null until a screen asked for it.",
          ),
        z
          .null()
          .describe(
            "NEWS-00. The lead item's picture cache key; null until a screen asked for it.",
          ),
      ])
      .describe(
        "NEWS-00. The lead item's picture cache key; null until a screen asked for it.",
      )
      .optional(),
    /**NEWS-00. The Key points text, written on the hub from the article.*/
    summary: z
      .string()
      .min(1)
      .describe(
        "NEWS-00. The Key points text, written on the hub from the article.",
      )
      .optional(),
    /**NEWS-00. The band the summary was written for; a viewer of a younger band never sees an older band's summary.*/
    summary_band: z
      .enum(["child", "teen", "adult"])
      .describe(
        "NEWS-00. The band the summary was written for; a viewer of a younger band never sees an older band's summary.",
      )
      .optional(),
    summary_at: z.string().datetime({ offset: true }).optional(),
    pageviews_hint: z.number().gte(0).optional(),
    centroid_ref: z.string().min(1),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe("A cluster of related news items from independent publishers.");
export type NewsStory = z.infer<typeof NewsStory>;
