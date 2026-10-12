// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/feed-lists.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The news feed lists a household can turn on, one row per list: the bundled package that carries its feeds, a plain-words label, the user types it is offered to and the ones that start with it on. A user type not in offered_for never gets the list, whatever an admin setting says. The feeds themselves live in the list's package (feed-list-package.schema.json), never here.*/
export const FeedLists = z
  .object({
    /**The review month of this policy, such as 2026.10.*/
    version: z
      .string()
      .min(1)
      .describe("The review month of this policy, such as 2026.10."),
    lists: z
      .array(
        z
          .object({
            id: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
            /**The bundled module package that carries this list's feeds.*/
            package_id: z
              .string()
              .regex(new RegExp("^[a-z][a-z0-9-]*$"))
              .describe(
                "The bundled module package that carries this list's feeds.",
              ),
            label: z.string().min(1),
            /**One plain-words line, shown beside the list's name.*/
            does: z
              .string()
              .min(1)
              .describe("One plain-words line, shown beside the list's name."),
            /**User types this list may ever reach. The settings key for any other user type does not offer it and the hub ignores it if stored.*/
            offered_for: z
              .array(z.enum(["child", "teen", "adult"]))
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "User types this list may ever reach. The settings key for any other user type does not offer it and the hub ignores it if stored.",
              ),
            /**User types that start with this list on. Always a subset of offered_for.*/
            default_for: z
              .array(z.enum(["child", "teen", "adult"]))
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "User types that start with this list on. Always a subset of offered_for.",
              ),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .describe(
    "The news feed lists a household can turn on, one row per list: the bundled package that carries its feeds, a plain-words label, the user types it is offered to and the ones that start with it on. A user type not in offered_for never gets the list, whatever an admin setting says. The feeds themselves live in the list's package (feed-list-package.schema.json), never here.",
  );
export type FeedLists = z.infer<typeof FeedLists>;
