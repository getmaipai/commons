// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/transcript.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**CAPTION-01a: a transcript attached to a media file. Visibility follows the source file.*/
export const Transcript = z
  .object({
    id: z.string(),
    source: z.string(),
    language: z.string().min(1),
    current_revision: z.number().int().gte(0),
    segments: z.array(
      z
        .object({
          id: z.string().min(1),
          start: z.number().gte(0),
          end: z.number().gte(0),
          text: z.string(),
          speaker: z.string().optional(),
          words: z
            .array(
              z
                .object({
                  start: z.number().gte(0),
                  end: z.number().gte(0),
                  text: z.string(),
                  confidence: z.number().gte(0).lte(1).optional(),
                })
                .strict(),
            )
            .optional(),
          confidence: z.number().gte(0).lte(1).optional(),
        })
        .strict(),
    ),
    speakers: z.array(
      z.object({ id: z.string().min(1), label: z.string() }).strict(),
    ),
    vocabulary: z.array(z.string()),
    provenance: z
      .object({
        engine: z.string().min(1),
        model_id: z.string().min(1),
        source_kind: z.enum(["generated", "imported"]),
      })
      .strict(),
    clock: z
      .object({
        created_at: z.string().datetime({ offset: true }),
        updated_at: z.string().datetime({ offset: true }),
        hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
      })
      .strict(),
    created_at: z.string().datetime({ offset: true }).optional(),
    updated_at: z.string().datetime({ offset: true }).optional(),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node.")
      .optional(),
  })
  .strict()
  .describe(
    "CAPTION-01a: a transcript attached to a media file. Visibility follows the source file.",
  );
export type Transcript = z.infer<typeof Transcript>;
