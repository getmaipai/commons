// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/stack-part-choices.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Household choices for category part ordering and enabled parts.*/
export const StackPartChoices = z
  .object({})
  .catchall(
    z
      .object({
        /**Part ids in chosen order.*/
        order: z
          .array(
            z
              .string()
              .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
              .min(1)
              .describe("Opaque part key."),
          )
          .refine(
            (arr) => arr.every((item, i) => arr.indexOf(item) == i),
            "All items must be unique!",
          )
          .describe("Part ids in chosen order."),
        /**Part ids switched off.*/
        off: z
          .array(
            z
              .string()
              .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
              .min(1)
              .describe("Opaque part key."),
          )
          .refine(
            (arr) => arr.every((item, i) => arr.indexOf(item) == i),
            "All items must be unique!",
          )
          .describe("Part ids switched off."),
      })
      .strict(),
  )
  .describe("Household choices for category part ordering and enabled parts.");
export type StackPartChoices = z.infer<typeof StackPartChoices>;
