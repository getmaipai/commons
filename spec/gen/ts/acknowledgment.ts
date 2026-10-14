// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/acknowledgment.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A record that a person accepted named, versioned acknowledgments. Wording lives in the product, not in this record.*/
export const Acknowledgment = z
  .object({
    id: z.string().min(1),
    /**How this acknowledgment was accepted; this is the record provenance.*/
    source: z
      .literal("setup")
      .describe(
        "How this acknowledgment was accepted; this is the record provenance.",
      ),
    items: z
      .array(
        z
          .object({
            id: z.enum([
              "responsibility",
              "companions",
              "internet_safety",
              "fetching",
            ]),
            version: z.string().min(1),
          })
          .strict(),
      )
      .min(1)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      ),
    accepted_at: z.string().datetime({ offset: true }),
    /**Null when accepted before the owner exists; set when the owner is created.*/
    person_id: z
      .union([
        z
          .string()
          .describe(
            "Null when accepted before the owner exists; set when the owner is created.",
          ),
        z
          .null()
          .describe(
            "Null when accepted before the owner exists; set when the owner is created.",
          ),
      ])
      .describe(
        "Null when accepted before the owner exists; set when the owner is created.",
      ),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
  })
  .strict()
  .and(
    z.intersection(
      z.intersection(
        z.object({ items: z.any().optional() }),
        z.object({ items: z.any().optional() }),
      ),
      z.intersection(
        z.object({ items: z.any().optional() }),
        z.object({ items: z.any().optional() }),
      ),
    ),
  )
  .describe(
    "A record that a person accepted named, versioned acknowledgments. Wording lives in the product, not in this record.",
  );
export type Acknowledgment = z.infer<typeof Acknowledgment>;
