// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-segments-request.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Stack media.segments job input. Supply exactly one media source and optionally one clean reference source.*/
export const MediaSegmentsRequest = z
  .object({
    url: z.string().url().optional(),
    path: z.string().min(1).optional(),
    referenceUrl: z.string().url().optional(),
    referencePath: z.string().min(1).optional(),
    kinds: z
      .array(
        z.enum([
          "ad",
          "sponsor",
          "selfpromo",
          "intro",
          "outro",
          "recap",
          "filler",
          "bumper",
        ]),
      )
      .optional(),
    fetch: z
      .object({ userAgent: z.string().min(1).max(256).optional() })
      .strict()
      .default({}),
    keepCopy: z.boolean().default(true),
    expectedDurationSec: z.number().gt(0).optional(),
  })
  .strict()
  .and(
    z.any().superRefine((x, ctx) => {
      const schemas = [
        z
          .any()
          .refine(
            (value) => !z.any().safeParse(value).success,
            "Invalid input: Should NOT be valid against schema",
          ),
        z
          .any()
          .refine(
            (value) => !z.any().safeParse(value).success,
            "Invalid input: Should NOT be valid against schema",
          ),
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
                  "Invalid input: Should pass single schema. Passed " + passed,
              }
            : {
                path: [],
                code: "custom",
                errors: [errors],
                message:
                  "Invalid input: Should pass single schema. Passed " + passed,
              },
        );
      }
    }),
  )
  .and(
    z
      .any()
      .refine(
        (value) => !z.any().safeParse(value).success,
        "Invalid input: Should NOT be valid against schema",
      ),
  )
  .describe(
    "Stack media.segments job input. Supply exactly one media source and optionally one clean reference source.",
  );
export type MediaSegmentsRequest = z.infer<typeof MediaSegmentsRequest>;
