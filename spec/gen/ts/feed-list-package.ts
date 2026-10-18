// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/feed-list-package.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The feeds.json file of a feed-list package (a module package): the public feeds one list carries. Every host needs a privacy row in the package manifest's data_sources.*/
export const FeedListPackage = z
  .object({
    /**The id of the list in spec/news/feed-lists.json this file fills.*/
    list_id: z
      .string()
      .regex(new RegExp("^[a-z][a-z0-9-]*$"))
      .describe(
        "The id of the list in spec/news/feed-lists.json this file fills.",
      ),
    feeds: z
      .array(
        z
          .object({
            /**The RSS or Atom feed address. https only.*/
            url: z
              .string()
              .regex(new RegExp("^https://"))
              .describe("The RSS or Atom feed address. https only."),
            title: z.string().min(1),
            publisher: z.string().min(1),
            lang: z.string().regex(new RegExp("^[a-z]{2,3}$")).optional(),
            /**Topic ids (spec/news/topics.json) this feed covers; the hub tags every story the feed carries with them.*/
            topics_hint: z
              .array(z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")))
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "Topic ids (spec/news/topics.json) this feed covers; the hub tags every story the feed carries with them.",
              )
              .optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .describe(
    "The feeds.json file of a feed-list package (a module package): the public feeds one list carries. Every host needs a privacy row in the package manifest's data_sources.",
  );
export type FeedListPackage = z.infer<typeof FeedListPackage>;
