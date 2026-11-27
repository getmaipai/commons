// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-segments.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One segment analysis for one stored media file, keyed by its content hash and duration. Never keyed by episode: dynamic ad insertion changes bytes and therefore creates a new analysis.*/
export const MediaSegments = z
  .object({
    fileSha256: z.string().regex(new RegExp("^[0-9a-fA-F]{64}$")),
    durationSec: z.number().gt(0),
    segments: z.array(
      z
        .object({
          id: z.string().min(1),
          kind: z.enum([
            "ad",
            "sponsor",
            "selfpromo",
            "intro",
            "outro",
            "recap",
            "filler",
          ]),
          startSec: z.number().gte(0),
          endSec: z.number().gte(0),
          confidence: z.number().gte(0).lte(1),
          source: z.enum([
            "fingerprint",
            "text-pattern",
            "llm",
            "alignment",
            "person",
            "chapter",
          ]),
          sources: z
            .array(
              z.enum([
                "fingerprint",
                "text-pattern",
                "llm",
                "alignment",
                "person",
                "chapter",
              ]),
            )
            .optional(),
          status: z.enum(["auto", "held", "confirmed", "rejected"]),
          label: z.string().optional(),
        })
        .strict()
        .describe(
          "Section labels cold-open, theme, main, interview, pretape, credits and plugs are reserved for an additive enum extension.",
        ),
    ),
    producedBy: z
      .object({
        transcriptRevision: z.string().min(1),
        modelId: z.string().min(1),
        pipelineVersion: z.string().min(1),
        createdAt: z.string().min(1),
      })
      .strict(),
    cleanCopy: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [z.boolean(), z.literal("unknown")];
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
      })
      .optional(),
    created_at: z.string().datetime({ offset: true }),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
    provenance: z.string().min(1),
  })
  .strict()
  .describe(
    "One segment analysis for one stored media file, keyed by its content hash and duration. Never keyed by episode: dynamic ad insertion changes bytes and therefore creates a new analysis.",
  );
export type MediaSegments = z.infer<typeof MediaSegments>;
