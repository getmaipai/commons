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
