// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-progress.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MEDIA-SPEC-01 (media design sections 7 and 10). One row per person and item: where they are, whether they finished, how often they played it, and their bookmarks. Merge rule (one function, mergeProgress): newest wins by the server stamp after skew correction, a rewind applies when newer, completed is a latch only the person clears, marks union by at_s, a child's row is never written by another person's device.*/
export const MediaProgress = z
  .object({
    id: z.string().regex(new RegExp("^mprg-[a-z0-9]{6,}$")),
    person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    media_id: z.string().regex(new RegExp("^media-[a-z0-9]{6,}$")),
    /**Seconds for anything with a timeline, or a reader locator plus percent for a book.*/
    position: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z.object({ seconds: z.number().gte(0) }).strict(),
          z
            .object({
              locator: z
                .object({
                  kind: z.enum(["cfi", "page"]),
                  cfi: z.union([z.string(), z.null()]).default(null),
                  page: z
                    .union([z.number().int().gte(1), z.null()])
                    .default(null),
                  spine_index: z
                    .union([z.number().int().gte(0), z.null()])
                    .default(null),
                  block_index: z
                    .union([z.number().int().gte(0), z.null()])
                    .default(null),
                })
                .strict(),
              percent: z.number().gte(0).lte(100),
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
      })
      .describe(
        "Seconds for anything with a timeline, or a reader locator plus percent for a book.",
      ),
    duration_s: z.union([z.number().gte(0), z.null()]).default(null),
    /**A latch: video, episode and film at 90 percent, podcast episode and audiobook at 95 percent, a book by the person or at its end. A track never latches; it counts finishes.*/
    completed: z
      .boolean()
      .describe(
        "A latch: video, episode and film at 90 percent, podcast episode and audiobook at 95 percent, a book by the person or at its end. A track never latches; it counts finishes.",
      ),
    plays: z.number().int().gte(0).default(0),
    skips: z.number().int().gte(0).default(0),
    finishes: z.number().int().gte(0).default(0),
    marks: z
      .array(
        z
          .object({
            at_s: z.number().gte(0),
            label: z.union([z.string(), z.null()]).default(null),
          })
          .strict(),
      )
      .default([]),
    /**The device that wrote the newest position, for the Continue here card.*/
    device_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^device-[a-z0-9]{6,}$"))
          .describe(
            "The device that wrote the newest position, for the Continue here card.",
          ),
        z
          .null()
          .describe(
            "The device that wrote the newest position, for the Continue here card.",
          ),
      ])
      .describe(
        "The device that wrote the newest position, for the Continue here card.",
      )
      .default(null),
    /**Server clock after skew correction.*/
    updated_at: z
      .string()
      .datetime({ offset: true })
      .describe("Server clock after skew correction."),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    provenance: z.string().min(1),
  })
  .strict()
  .describe(
    "MEDIA-SPEC-01 (media design sections 7 and 10). One row per person and item: where they are, whether they finished, how often they played it, and their bookmarks. Merge rule (one function, mergeProgress): newest wins by the server stamp after skew correction, a rewind applies when newer, completed is a latch only the person clears, marks union by at_s, a child's row is never written by another person's device.",
  );
export type MediaProgress = z.infer<typeof MediaProgress>;
