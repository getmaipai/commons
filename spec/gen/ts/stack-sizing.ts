// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/stack-sizing.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Sizing response for GET /stack/v1/sizing?percent=N.*/
export const StackSizing = z
  .object({
    /**Requested memory budget percentage.*/
    percent: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Requested memory budget percentage."),
    /**Memory budget in bytes.*/
    budget_bytes: z.number().int().gte(0).describe("Memory budget in bytes."),
    /**Per-category sizing choices.*/
    categories: z
      .array(
        z
          .object({
            /**Open category name.*/
            category: z.string().min(1).describe("Open category name."),
            tiers: z
              .object({
                standard: z
                  .object({
                    /**Selected part id, if any.*/
                    part_id: z
                      .union([
                        z
                          .string()
                          .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
                          .min(1)
                          .describe("Opaque part key."),
                        z.null(),
                      ])
                      .describe("Selected part id, if any."),
                    /**Whether this tier fits.*/
                    fits: z.boolean().describe("Whether this tier fits."),
                    /**Reason, if it does not fit.*/
                    reason: z
                      .union([
                        z.string().describe("Reason, if it does not fit."),
                        z.null().describe("Reason, if it does not fit."),
                      ])
                      .describe("Reason, if it does not fit."),
                  })
                  .strict(),
                boost: z
                  .object({
                    /**Selected part id, if any.*/
                    part_id: z
                      .union([
                        z
                          .string()
                          .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
                          .min(1)
                          .describe("Opaque part key."),
                        z.null(),
                      ])
                      .describe("Selected part id, if any."),
                    /**Whether this tier fits.*/
                    fits: z.boolean().describe("Whether this tier fits."),
                    /**Reason, if it does not fit.*/
                    reason: z
                      .union([
                        z.string().describe("Reason, if it does not fit."),
                        z.null().describe("Reason, if it does not fit."),
                      ])
                      .describe("Reason, if it does not fit."),
                  })
                  .strict(),
                max: z
                  .object({
                    /**Selected part id, if any.*/
                    part_id: z
                      .union([
                        z
                          .string()
                          .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
                          .min(1)
                          .describe("Opaque part key."),
                        z.null(),
                      ])
                      .describe("Selected part id, if any."),
                    /**Whether this tier fits.*/
                    fits: z.boolean().describe("Whether this tier fits."),
                    /**Reason, if it does not fit.*/
                    reason: z
                      .union([
                        z.string().describe("Reason, if it does not fit."),
                        z.null().describe("Reason, if it does not fit."),
                      ])
                      .describe("Reason, if it does not fit."),
                  })
                  .strict(),
              })
              .strict(),
            /**Human-readable sizing summary.*/
            line: z.string().min(1).describe("Human-readable sizing summary."),
          })
          .strict(),
      )
      .describe("Per-category sizing choices."),
  })
  .strict()
  .describe("Sizing response for GET /stack/v1/sizing?percent=N.");
export type StackSizing = z.infer<typeof StackSizing>;
