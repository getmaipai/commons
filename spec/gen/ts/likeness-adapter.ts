// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/likeness-adapter.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**LIKENESS-SIMPLIFY-01. The subject binding for a saved style (LoRA) in the household library. subject_person_id is a household adult the style looks like, or null for "Nobody (not a real person)". A style of a minor or of anyone who is not an eligible living household adult is refused at import and never has a record. A subject-linked style is always adult-only. The household likeness option controls whether household members may make pictures, videos and songs with or of one another.*/
export const LikenessAdapter = z
  .object({
    id: z.string().min(1),
    /**The style's id in the Stack's library for this medium.*/
    adapter_id: z
      .string()
      .min(1)
      .describe("The style's id in the Stack's library for this medium."),
    medium: z.enum(["picture", "video"]),
    /**The household adult this style looks like, or null for nobody.*/
    subject_person_id: z
      .union([
        z
          .string()
          .describe(
            "The household adult this style looks like, or null for nobody.",
          ),
        z
          .null()
          .describe(
            "The household adult this style looks like, or null for nobody.",
          ),
      ])
      .describe(
        "The household adult this style looks like, or null for nobody.",
      ),
    /**The style's audience. Always adult-only when subject_person_id is set.*/
    classification: z
      .enum(["all-ages", "adult-only"])
      .describe(
        "The style's audience. Always adult-only when subject_person_id is set.",
      ),
    state: z.enum(["active", "removal_queued", "removed"]),
    /**The adult who added the style and answered "Who does this style look like?".*/
    declared_by: z
      .string()
      .min(1)
      .describe(
        'The adult who added the style and answered "Who does this style look like?".',
      ),
    /**How the record came to be; this is the record provenance.*/
    source: z
      .literal("import")
      .describe("How the record came to be; this is the record provenance."),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
  })
  .strict()
  .and(z.any())
  .describe(
    'LIKENESS-SIMPLIFY-01. The subject binding for a saved style (LoRA) in the household library. subject_person_id is a household adult the style looks like, or null for "Nobody (not a real person)". A style of a minor or of anyone who is not an eligible living household adult is refused at import and never has a record. A subject-linked style is always adult-only. The household likeness option controls whether household members may make pictures, videos and songs with or of one another.',
  );
export type LikenessAdapter = z.infer<typeof LikenessAdapter>;
