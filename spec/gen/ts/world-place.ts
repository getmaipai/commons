// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/world-place.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A named world clock location for a person. Home enforces a maximum of 12 world places per person; this schema does not.*/
export const WorldPlace = z
  .object({
    /**Stable id, never reused, even after deleted_at is set.*/
    id: z
      .string()
      .regex(new RegExp("^place-[a-z0-9]{6,}$"))
      .describe("Stable id, never reused, even after deleted_at is set."),
    /**Person who owns this world place.*/
    person: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe("Person who owns this world place."),
    name: z.string().min(1).max(120),
    country: z.string().max(120),
    /**IANA time zone name accepted by Intl.DateTimeFormat.*/
    zone: z
      .string()
      .min(1)
      .max(64)
      .describe("IANA time zone name accepted by Intl.DateTimeFormat."),
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
  .describe(
    "A named world clock location for a person. Home enforces a maximum of 12 world places per person; this schema does not.",
  );
export type WorldPlace = z.infer<typeof WorldPlace>;
