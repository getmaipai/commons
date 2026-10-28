// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-source.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MEDIA-SPEC-01 (media design section 7). Where media items come from: a library root folder on the hub or a mounted share, a podcast feed, a web channel followed at a person's pace, or a pasted link. Roots of different kinds may not overlap (enforced at save). A child never adds a source. RADIO-01: a station is a live internet radio stream; its stream address is url, its name is label, and the station object holds the rest.*/
export const MediaSource = z
  .object({
    id: z.string().regex(new RegExp("^msrc-[a-z0-9]{6,}$")),
    kind: z.enum(["root", "feed", "channel", "link", "station"]),
    scope: z.enum(["household", "person"]),
    /**Set when scope is person; the adult who created a household source otherwise (for saved copies' ownership).*/
    owner_person_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^person-[a-z0-9]{6,}$"))
          .describe(
            "Set when scope is person; the adult who created a household source otherwise (for saved copies' ownership).",
          ),
        z
          .null()
          .describe(
            "Set when scope is person; the adult who created a household source otherwise (for saved copies' ownership).",
          ),
      ])
      .describe(
        "Set when scope is person; the adult who created a household source otherwise (for saved copies' ownership).",
      )
      .default(null),
    label: z.string().min(1),
    root: z
      .union([
        z
          .object({
            /**A nas_mounts row when the folder is on a mounted share; null for a folder on the hub's own disk.*/
            mount_id: z
              .union([
                z
                  .string()
                  .describe(
                    "A nas_mounts row when the folder is on a mounted share; null for a folder on the hub's own disk.",
                  ),
                z
                  .null()
                  .describe(
                    "A nas_mounts row when the folder is on a mounted share; null for a folder on the hub's own disk.",
                  ),
              ])
              .describe(
                "A nas_mounts row when the folder is on a mounted share; null for a folder on the hub's own disk.",
              ),
            path: z.string().min(1),
            kinds: z
              .array(
                z.enum([
                  "video",
                  "episode",
                  "film",
                  "track",
                  "book",
                  "audiobook",
                ]),
              )
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              ),
          })
          .strict(),
        z.null(),
      ])
      .default(null),
    /**For kind feed: the feed record (purpose podcast).*/
    feed_id: z
      .union([
        z
          .string()
          .describe("For kind feed: the feed record (purpose podcast)."),
        z.null().describe("For kind feed: the feed record (purpose podcast)."),
      ])
      .describe("For kind feed: the feed record (purpose podcast).")
      .default(null),
    /**For a channel, a link or a station (the stream address). Never logged; excluded from an export when it carries a token.*/
    url: z
      .union([
        z
          .string()
          .url()
          .describe(
            "For a channel, a link or a station (the stream address). Never logged; excluded from an export when it carries a token.",
          ),
        z
          .null()
          .describe(
            "For a channel, a link or a station (the stream address). Never logged; excluded from an export when it carries a token.",
          ),
      ])
      .describe(
        "For a channel, a link or a station (the stream address). Never logged; excluded from an export when it carries a token.",
      )
      .default(null),
    /**For kind station: what the directory told us about the stream. live is always true; a station has no duration and no seek.*/
    station: z
      .union([
        z
          .object({
            live: z.literal(true),
            favicon_url: z.union([z.string().url(), z.null()]),
            tags: z
              .array(z.string().min(1))
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              ),
            country_code: z.union([
              z.string().regex(new RegExp("^[A-Z]{2}$")),
              z.null(),
            ]),
            codec: z.union([z.string().min(1), z.null()]),
            bitrate_kbps: z.union([z.number().int().gte(0), z.null()]),
          })
          .strict()
          .describe(
            "For kind station: what the directory told us about the stream. live is always true; a station has no duration and no seek.",
          ),
        z
          .null()
          .describe(
            "For kind station: what the directory told us about the stream. live is always true; a station has no duration and no seek.",
          ),
      ])
      .describe(
        "For kind station: what the directory told us about the stream. live is always true; a station has no duration and no seek.",
      )
      .default(null),
    extractor: z.union([z.string(), z.null()]).default(null),
    auto: z
      .object({
        save: z.enum(["none", "audio", "video"]),
        keep_latest: z.union([z.number().int().gte(1), z.null()]).default(null),
        remove_watched: z.boolean().default(false),
        max_per_check: z.number().int().gte(1).lte(10).default(2),
        max_duration_s: z
          .union([z.number().int().gte(1), z.null()])
          .default(null),
        min_duration_s: z
          .union([z.number().int().gte(0), z.null()])
          .default(null),
        skip_shorts: z.boolean().default(true),
        cutoff_date: z.union([z.string().date(), z.null()]).default(null),
        quality_max_height: z
          .union([z.number().int().gte(144), z.null()])
          .default(null),
      })
      .strict()
      .default({
        save: "none",
        keep_latest: null,
        remove_watched: false,
        max_per_check: 2,
        max_duration_s: null,
        min_duration_s: null,
        skip_shorts: true,
        cutoff_date: null,
        quality_max_height: null,
      }),
    /**Per-source playback speed (podcasts). Null uses the person's audio.speed key.*/
    speed: z
      .union([
        z
          .number()
          .gte(0.5)
          .lte(3)
          .describe(
            "Per-source playback speed (podcasts). Null uses the person's audio.speed key.",
          ),
        z
          .null()
          .describe(
            "Per-source playback speed (podcasts). Null uses the person's audio.speed key.",
          ),
      ])
      .describe(
        "Per-source playback speed (podcasts). Null uses the person's audio.speed key.",
      )
      .default(null),
    skip_intro_s: z.number().int().gte(0).default(0),
    skip_outro_s: z.number().int().gte(0).default(0),
    poll_minutes: z.number().int().gte(15).default(60),
    paused: z.boolean().default(false),
    last_checked_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .default(null),
    last_status: z
      .union([
        z.literal("ok"),
        z.literal("failed"),
        z.literal("quiet"),
        z.literal("root_missing"),
        z.literal(null),
      ])
      .default(null),
    failures: z.number().int().gte(0).default(0),
    backoff_until: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .default(null),
    visible_to: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
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
      .default("household"),
    /**"Deleted stays gone": the external ids (or root paths) of items a person deleted, so a re-poll or a re-scan never brings them back.*/
    archive: z
      .array(z.string().min(1))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        '"Deleted stays gone": the external ids (or root paths) of items a person deleted, so a re-poll or a re-scan never brings them back.',
      )
      .default([]),
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
    "MEDIA-SPEC-01 (media design section 7). Where media items come from: a library root folder on the hub or a mounted share, a podcast feed, a web channel followed at a person's pace, or a pasted link. Roots of different kinds may not overlap (enforced at save). A child never adds a source. RADIO-01: a station is a live internet radio stream; its stream address is url, its name is label, and the station object holds the rest.",
  );
export type MediaSource = z.infer<typeof MediaSource>;
