// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/likeness-adapter.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**LIKENESS-01. Who a saved style (LoRA) in the household library looks like, declared when it was added. subject_person_id is a household adult whose consent was on at that moment, or null for "Nobody (not a real person)". A style of a minor or of anyone who is not a consenting household adult is refused at import and never has a record. A subject-linked style is always adult-only and is usable only while the subject's consent is on; when the consent goes off the record moves to removal_queued and the style is removed from the library.*/
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
    'LIKENESS-01. Who a saved style (LoRA) in the household library looks like, declared when it was added. subject_person_id is a household adult whose consent was on at that moment, or null for "Nobody (not a real person)". A style of a minor or of anyone who is not a consenting household adult is refused at import and never has a record. A subject-linked style is always adult-only and is usable only while the subject\'s consent is on; when the consent goes off the record moves to removal_queued and the style is removed from the library.',
  );
export type LikenessAdapter = z.infer<typeof LikenessAdapter>;
