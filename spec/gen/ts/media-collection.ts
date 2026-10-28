// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-collection.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MEDIA-SPEC-01 (media design section 7). A person's ordered references to media items: liked, watch later, the queue, a playlist, the watchlist, pins. One liked, one watch_later and one queue per person exist by construction. The list record stays for text lists (its items are text with a checked state; these are references with order, status and a pointer). PODCAST-PORT-03: a filter is a saved episode filter; its items stay empty and its rules say which episodes match.*/
export const MediaCollection = z
  .object({
    id: z.string().regex(new RegExp("^mcol-[a-z0-9]{6,}$")),
    person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    kind: z.enum([
      "liked",
      "watch_later",
      "queue",
      "playlist",
      "watchlist",
      "pins",
      "filter",
    ]),
    title: z.string().min(1),
    items: z.array(
      z
        .object({
          media_id: z.string().regex(new RegExp("^media-[a-z0-9]{6,}$")),
          added_at: z.string().datetime({ offset: true }),
          position: z.number().int().gte(0),
          /**Watchlist only.*/
          status: z
            .union([
              z.literal("want"),
              z.literal("watching"),
              z.literal("completed"),
              z.literal(null),
            ])
            .describe("Watchlist only.")
            .default(null),
        })
        .strict(),
    ),
    /**The queue's current entry (an index into items).*/
    pointer: z
      .union([
        z
          .number()
          .int()
          .gte(0)
          .describe("The queue's current entry (an index into items)."),
        z.null().describe("The queue's current entry (an index into items)."),
      ])
      .describe("The queue's current entry (an index into items).")
      .default(null),
    /**Null is private. A child's collections are never shared outside the household.*/
    shared_to: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z.null(),
          z.literal("household"),
          z
            .array(z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")))
            .refine(
              (arr) => arr.every((item, i) => arr.indexOf(item) == i),
              "All items must be unique!",
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
        "Null is private. A child's collections are never shared outside the household.",
      )
      .default(null),
    /**Null for every kind but filter. For kind filter, the saved episode filter: every rule given must match (AND). Omitted rules do not restrict. Evaluated by the hub against the person's own progress and the shows they can see.*/
    rules: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z.null(),
          z
            .object({
              /**True keeps episodes not started.*/
              unplayed: z
                .boolean()
                .describe("True keeps episodes not started.")
                .optional(),
              /**True keeps episodes started but not finished.*/
              in_progress: z
                .boolean()
                .describe("True keeps episodes started but not finished.")
                .optional(),
              /**True keeps episodes saved to the household file store.*/
              saved: z
                .boolean()
                .describe(
                  "True keeps episodes saved to the household file store.",
                )
                .optional(),
              /**Shortest length in minutes.*/
              min_minutes: z
                .number()
                .int()
                .gte(0)
                .describe("Shortest length in minutes.")
                .optional(),
              /**Longest length in minutes.*/
              max_minutes: z
                .number()
                .int()
                .gte(0)
                .describe("Longest length in minutes.")
                .optional(),
              /**Only episodes of these shows.*/
              source_ids: z
                .array(z.string().regex(new RegExp("^msrc-[a-z0-9]{6,}$")))
                .refine(
                  (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                  "All items must be unique!",
                )
                .describe("Only episodes of these shows.")
                .optional(),
              /**Only episodes published in the last N days.*/
              released_within_days: z
                .number()
                .int()
                .gte(1)
                .describe("Only episodes published in the last N days.")
                .optional(),
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
        "Null for every kind but filter. For kind filter, the saved episode filter: every rule given must match (AND). Omitted rules do not restrict. Evaluated by the hub against the person's own progress and the shows they can see.",
      )
      .default(null),
    /**TRASH-01. Set when a person moves the record to the household trash; null while live. A trashed record is hidden everywhere and restorable until trash_until.*/
    deleted_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "TRASH-01. Set when a person moves the record to the household trash; null while live. A trashed record is hidden everywhere and restorable until trash_until.",
          ),
        z
          .null()
          .describe(
            "TRASH-01. Set when a person moves the record to the household trash; null while live. A trashed record is hidden everywhere and restorable until trash_until.",
          ),
      ])
      .describe(
        "TRASH-01. Set when a person moves the record to the household trash; null while live. A trashed record is hidden everywhere and restorable until trash_until.",
      )
      .default(null),
    /**TRASH-01. When the trash purges the record for good; set together with deleted_at.*/
    trash_until: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "TRASH-01. When the trash purges the record for good; set together with deleted_at.",
          ),
        z
          .null()
          .describe(
            "TRASH-01. When the trash purges the record for good; set together with deleted_at.",
          ),
      ])
      .describe(
        "TRASH-01. When the trash purges the record for good; set together with deleted_at.",
      )
      .default(null),
    created_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    provenance: z.string().min(1),
  })
  .strict()
  .describe(
    "MEDIA-SPEC-01 (media design section 7). A person's ordered references to media items: liked, watch later, the queue, a playlist, the watchlist, pins. One liked, one watch_later and one queue per person exist by construction. The list record stays for text lists (its items are text with a checked state; these are references with order, status and a pointer). PODCAST-PORT-03: a filter is a saved episode filter; its items stay empty and its rules say which episodes match.",
  );
export type MediaCollection = z.infer<typeof MediaCollection>;
