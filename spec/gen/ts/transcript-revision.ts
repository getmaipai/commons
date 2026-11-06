// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/transcript-revision.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**CAPTION-01a: an immutable transcript revision and its operations.*/
export const TranscriptRevision = z
  .object({
    id: z.string(),
    transcript_id: z.string(),
    n: z.number().int().gte(1),
    author: z.string(),
    reason: z.string(),
    ops: z.array(
      z.any().superRefine((x, ctx) => {
        const schemas = [
          z
            .object({
              kind: z.literal("edit_text"),
              segment_id: z.string(),
              text: z.string(),
            })
            .strict(),
          z
            .object({
              kind: z.literal("retime"),
              segment_id: z.string(),
              start: z.number().gte(0),
              end: z.number().gte(0),
            })
            .strict(),
          z
            .object({
              kind: z.literal("split"),
              segment_id: z.string(),
              at: z.number().gte(0),
              new_segment_id: z.string(),
            })
            .strict(),
          z
            .object({
              kind: z.literal("merge"),
              segment_ids: z.array(z.string()).min(2).max(2),
            })
            .strict(),
          z
            .object({
              kind: z.literal("set_speaker"),
              segment_id: z.string(),
              speaker: z.string(),
            })
            .strict(),
          z
            .object({
              kind: z.literal("rename_speaker"),
              speaker: z.string(),
              label: z.string(),
            })
            .strict(),
          z
            .object({
              kind: z.literal("replace_range"),
              start: z.number().gte(0),
              end: z.number().gte(0),
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
            })
            .strict(),
        ];
        const { errors, failed } = schemas.reduce<{
          errors: z.core.$ZodIssue[];
          failed: number;
        }>(
          ({ errors, failed }, schema) =>
            ((result) =>
              result.error
                ? {
                    errors: [...errors, ...result.error.issues],
                    failed: failed + 1,
                  }
                : { errors, failed })(schema.safeParse(x)),
          { errors: [], failed: 0 },
        );
        const passed = schemas.length - failed;
        if (passed !== 1) {
          ctx.addIssue(
            errors.length
              ? {
                  path: [],
                  code: "invalid_union",
                  errors: [errors],
                  message:
                    "Invalid input: Should pass single schema. Passed " +
                    passed,
                }
              : {
                  path: [],
                  code: "custom",
                  errors: [errors],
                  message:
                    "Invalid input: Should pass single schema. Passed " +
                    passed,
                },
          );
        }
      }),
    ),
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
        /**Hybrid logical clock: wall_ms:counter:node.*/
        hlc: z
          .string()
          .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
          .describe("Hybrid logical clock: wall_ms:counter:node."),
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
    "CAPTION-01a: an immutable transcript revision and its operations.",
  );
export type TranscriptRevision = z.infer<typeof TranscriptRevision>;
