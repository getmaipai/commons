// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/news-topics.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**NEWS-00. The fixed set of News topics (spec/news/topics.json): the channels a person can follow and the labels the embed role classifies each item against. `description` is the text the embed role compares an item's title and summary with. `bands` says which age bands are offered the topic: `kids` is offered to the child band only; the rest to teens and adults. Politics is deliberately not a topic (it folds into `world` and `local`).*/
export const NewsTopics = z
  .object({
    version: z.string().min(1),
    topics: z
      .array(
        z
          .object({
            id: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
            label: z.string().min(1).max(24),
            /**A lucide icon name (the kit icon registry).*/
            icon: z
              .string()
              .regex(new RegExp("^[a-z][a-z0-9-]*$"))
              .describe("A lucide icon name (the kit icon registry)."),
            description: z.string().min(20),
            /**NEWS-SECTION-STYLES-01. How the topic's section page arranges its stories, as Apple News does per category: top_stories (tall cards, then picture-right cards), special (two large cards, then picture-right cards), todays_news (tall cards, then one wide split card). Absent draws the lead-and-list page. Arrangement only: selection, order and age gates are unchanged.*/
            section_style: z
              .enum(["top_stories", "special", "todays_news"])
              .describe(
                "NEWS-SECTION-STYLES-01. How the topic's section page arranges its stories, as Apple News does per category: top_stories (tall cards, then picture-right cards), special (two large cards, then picture-right cards), todays_news (tall cards, then one wide split card). Absent draws the lead-and-list page. Arrangement only: selection, order and age gates are unchanged.",
              )
              .optional(),
            bands: z
              .array(z.enum(["child", "teen", "adult"]))
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              ),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .describe(
    "NEWS-00. The fixed set of News topics (spec/news/topics.json): the channels a person can follow and the labels the embed role classifies each item against. `description` is the text the embed role compares an item's title and summary with. `bands` says which age bands are offered the topic: `kids` is offered to the child band only; the rest to teens and adults. Politics is deliberately not a topic (it folds into `world` and `local`).",
  );
export type NewsTopics = z.infer<typeof NewsTopics>;
