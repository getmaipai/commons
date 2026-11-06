// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/caption-track.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**CAPTION-01a: captions for a transcript revision. Cue overlap is permitted.*/
export const CaptionTrack = z
  .object({
    id: z.string(),
    transcript_id: z.string(),
    language: z.string().min(1),
    based_on_revision: z.number().int().gte(0),
    provenance: z
      .object({
        source_kind: z.enum(["generated", "imported", "translated"]),
        engine: z.string().min(1),
      })
      .strict(),
    clock: z
      .object({
        created_at: z.string().datetime({ offset: true }),
        updated_at: z.string().datetime({ offset: true }),
        /**Hybrid logical clock: wall_ms:counter:node.*/
        hlc: z
          .string()
          .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
          .describe("Hybrid logical clock: wall_ms:counter:node."),
      })
      .strict(),
    cues: z.array(
      z
        .object({
          id: z.string(),
          segment_id: z.string().optional(),
          start: z.number().gte(0),
          end: z.number().gte(0),
          text: z.string(),
          text_overridden: z.boolean(),
        })
        .strict(),
    ),
    style: z
      .object({
        font_size: z.union([z.string(), z.number()]).optional(),
        color: z.union([z.string(), z.number()]).optional(),
        background: z.union([z.string(), z.number()]).optional(),
        outline: z.union([z.string(), z.number()]).optional(),
        align: z.union([z.string(), z.number()]).optional(),
        position: z.union([z.string(), z.number()]).optional(),
      })
      .catchall(z.any())
      .optional(),
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
    "CAPTION-01a: captions for a transcript revision. Cue overlap is permitted.",
  );
export type CaptionTrack = z.infer<typeof CaptionTrack>;
