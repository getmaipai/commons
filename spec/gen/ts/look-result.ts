// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/look-result.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A transient visual description held in memory only, never written, logged or returned by a route (Robot vision R1). Labels never go to a log.*/
export const LookResult = z
  .object({
    objects: z
      .array(
        z
          .object({
            label: z.string().min(1).max(64),
            count: z.number().int().gte(1),
            score: z.number().gte(0).lte(1),
            uncertain: z.boolean(),
            box: z.array(z.number().gte(0).lte(1)).min(4).max(4).optional(),
            attributes: z
              .object({
                colour: z.string().min(1).max(64).optional(),
                kind: z.string().min(1).max(64).optional(),
                make: z.string().min(1).max(64).optional(),
                model: z.string().min(1).max(64).optional(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .max(64),
    scene: z
      .object({
        light: z.enum(["dark", "dim", "bright"]),
        tags: z
          .array(
            z
              .object({
                label: z.string().min(1).max(64),
                score: z.number().gte(0).lte(1),
              })
              .strict(),
          )
          .max(64),
        room_type: z.string().min(1).max(64).optional(),
        colours: z.array(z.string().min(1).max(32)).max(8).optional(),
      })
      .strict(),
    cost: z
      .object({ ms: z.number().gte(0), tier: z.enum(["fast", "detailed"]) })
      .strict(),
  })
  .strict()
  .describe(
    "A transient visual description held in memory only, never written, logged or returned by a route (Robot vision R1). Labels never go to a log.",
  );
export type LookResult = z.infer<typeof LookResult>;
