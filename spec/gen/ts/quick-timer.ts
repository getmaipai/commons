// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/quick-timer.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A saved quick timer duration for a person.*/
export const QuickTimer = z
  .object({
    /**Stable id, never reused, even after deleted_at is set.*/
    id: z
      .string()
      .regex(new RegExp("^qtimer-[a-z0-9]{6,}$"))
      .describe("Stable id, never reused, even after deleted_at is set."),
    /**Person who owns this quick timer.*/
    person: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe("Person who owns this quick timer."),
    name: z.string().min(1).max(120),
    minutes: z.number().int().gte(1).lte(1440),
    position: z.number().int().gte(0),
    source: z.enum(["hub", "local"]),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    deleted_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .default(null),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe("A saved quick timer duration for a person.");
export type QuickTimer = z.infer<typeof QuickTimer>;
