// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/feed.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A household-configured news feed and its polling state.*/
export const Feed = z
  .object({
    id: z.string().regex(new RegExp("^feed-[a-z0-9]{6,}$")),
    url: z.string().url(),
    title: z.string().min(1),
    /**Registrable domain of the publisher.*/
    publisher: z
      .string()
      .min(1)
      .describe("Registrable domain of the publisher."),
    band: z.enum(["child", "teen", "adult"]),
    package_id: z.string().min(1).optional(),
    /**NEWS-00. The feed's format (JSON Feed joins RSS and Atom). Absent reads as rss.*/
    kind: z
      .enum(["rss", "atom", "json"])
      .describe(
        "NEWS-00. The feed's format (JSON Feed joins RSS and Atom). Absent reads as rss.",
      )
      .optional(),
    /**NEWS-00. The publisher's own home page, for the source line and the channel page.*/
    site_url: z
      .string()
      .url()
      .describe(
        "NEWS-00. The publisher's own home page, for the source line and the channel page.",
      )
      .optional(),
    /**NEWS-00. The favicon cache key; the hub serves the picture, never the publisher's address.*/
    icon_ref: z
      .string()
      .min(1)
      .describe(
        "NEWS-00. The favicon cache key; the hub serves the picture, never the publisher's address.",
      )
      .optional(),
    /**NEWS-00. Topic ids (spec/news/topics.json) a list package says this feed covers.*/
    topics_hint: z
      .array(z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "NEWS-00. Topic ids (spec/news/topics.json) a list package says this feed covers.",
      )
      .optional(),
    /**NEWS-00. The feed list (spec/news/feed-lists.json) this feed came from.*/
    list_id: z
      .string()
      .regex(new RegExp("^[a-z][a-z0-9-]*$"))
      .describe(
        "NEWS-00. The feed list (spec/news/feed-lists.json) this feed came from.",
      )
      .optional(),
    /**NEWS-00. Reserved for FEED-ALERTS-01: this feed may raise breaking-news alerts. Nothing reads it yet.*/
    alerts: z
      .boolean()
      .describe(
        "NEWS-00. Reserved for FEED-ALERTS-01: this feed may raise breaking-news alerts. Nothing reads it yet.",
      )
      .optional(),
    person_id: z.string().min(1).optional(),
    etag: z.string().optional(),
    last_modified: z.string().optional(),
    poll_interval_s: z.number().int().gte(900),
    next_poll_at: z.string().datetime({ offset: true }),
    fail_count: z.number().int().gte(0),
    quiet_until: z.string().datetime({ offset: true }).optional(),
    enabled: z.boolean(),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
    provenance: z.string().min(1),
  })
  .strict()
  .describe("A household-configured news feed and its polling state.");
export type Feed = z.infer<typeof Feed>;
