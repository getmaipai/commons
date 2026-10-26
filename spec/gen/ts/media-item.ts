// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-item.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MEDIA-SPEC-01 (home docs/design/media-apps-blend-2026-10-17.md section 7). One playable or readable thing in the household's media library: a video, a show's episode, a film, a music track, a podcast episode, a book, an audiobook or one chapter of a multi-file audiobook. Household scope; who may see it is band_ok plus the source's visible_to. Identity: one item per (source_id, external.id) for a web item, or per (location.root_id, location.path) for a file on a library root; a re-scan updates, never duplicates.*/
export const MediaItem = z
  .object({
    /**Stable id, never reused.*/
    id: z
      .string()
      .regex(new RegExp("^media-[a-z0-9]{6,}$"))
      .describe("Stable id, never reused."),
    /**`chapter` is one file of a folder audiobook (a folder of numbered mp3s); its parent is `parent_id`.*/
    kind: z
      .enum([
        "video",
        "episode",
        "film",
        "track",
        "podcast_episode",
        "book",
        "audiobook",
        "chapter",
      ])
      .describe(
        "`chapter` is one file of a folder audiobook (a folder of numbered mp3s); its parent is `parent_id`.",
      ),
    title: z.string().min(1),
    /**A second line: the channel, show, artist or author as the app shows it. Books and audiobooks of the same title in one folder are linked when their subtitles match.*/
    subtitle: z
      .union([
        z
          .string()
          .describe(
            "A second line: the channel, show, artist or author as the app shows it. Books and audiobooks of the same title in one folder are linked when their subtitles match.",
          ),
        z
          .null()
          .describe(
            "A second line: the channel, show, artist or author as the app shows it. Books and audiobooks of the same title in one folder are linked when their subtitles match.",
          ),
      ])
      .describe(
        "A second line: the channel, show, artist or author as the app shows it. Books and audiobooks of the same title in one folder are linked when their subtitles match.",
      )
      .default(null),
    /**Plain text, never HTML. Passes the band check with the title before band_ok includes child.*/
    description: z
      .union([
        z
          .string()
          .describe(
            "Plain text, never HTML. Passes the band check with the title before band_ok includes child.",
          ),
        z
          .null()
          .describe(
            "Plain text, never HTML. Passes the band check with the title before band_ok includes child.",
          ),
      ])
      .describe(
        "Plain text, never HTML. Passes the band check with the title before band_ok includes child.",
      )
      .default(null),
    /**Lyrics are null when unavailable, or plain text without HTML. Text passes the same band check as description with the title before band_ok includes child.*/
    lyrics: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z.null(),
          z
            .object({
              source: z.enum(["file", "sidecar", "made", "lrclib"]),
              /**Plain text, never HTML. Passes the same band check as description with the title before band_ok includes child.*/
              text: z
                .string()
                .min(1)
                .describe(
                  "Plain text, never HTML. Passes the same band check as description with the title before band_ok includes child.",
                ),
              timed: z
                .array(
                  z
                    .object({
                      t: z.number().gte(0),
                      line: z.string(),
                      section: z.union([z.string(), z.null()]).optional(),
                    })
                    .strict(),
                )
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
        "Lyrics are null when unavailable, or plain text without HTML. Text passes the same band check as description with the title before band_ok includes child.",
      )
      .default(null),
    /**A rescan updates every field except these; an edit adds the field name here.*/
    locked_fields: z
      .array(z.enum(["title", "description", "artist", "artwork"]))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "A rescan updates every field except these; an edit adds the field name here.",
      )
      .default([]),
    /**The media-source this item came from (a root, a feed, a channel or a pasted link).*/
    source_id: z
      .string()
      .regex(new RegExp("^msrc-[a-z0-9]{6,}$"))
      .describe(
        "The media-source this item came from (a root, a feed, a channel or a pasted link).",
      ),
    /**For a `chapter` item: the audiobook it belongs to. Null otherwise.*/
    parent_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^media-[a-z0-9]{6,}$"))
          .describe(
            "For a `chapter` item: the audiobook it belongs to. Null otherwise.",
          ),
        z
          .null()
          .describe(
            "For a `chapter` item: the audiobook it belongs to. Null otherwise.",
          ),
      ])
      .describe(
        "For a `chapter` item: the audiobook it belongs to. Null otherwise.",
      )
      .default(null),
    /**Where the bytes are. Exactly one shape: a saved copy in the household file store, a file on a library root, or a stream-only address (a podcast episode not saved yet).*/
    location: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z
            .object({
              file_id: z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")),
            })
            .strict(),
          z
            .object({
              root_id: z.string().regex(new RegExp("^msrc-[a-z0-9]{6,}$")),
              /**Relative to the root, forward slashes, no traversal.*/
              path: z
                .string()
                .regex(new RegExp("^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$)).+$"))
                .min(1)
                .describe(
                  "Relative to the root, forward slashes, no traversal.",
                ),
            })
            .strict(),
          z.object({ url: z.string().url() }).strict(),
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
        "Where the bytes are. Exactly one shape: a saved copy in the household file store, a file on a library root, or a stream-only address (a podcast episode not saved yet).",
      ),
    media_type: z
      .string()
      .regex(
        new RegExp(
          "^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$",
        ),
      ),
    duration_s: z.union([z.number().gte(0), z.null()]).default(null),
    size: z.union([z.number().int().gte(0), z.null()]).default(null),
    width: z.union([z.number().int().gte(0), z.null()]).default(null),
    height: z.union([z.number().int().gte(0), z.null()]).default(null),
    /**As ffprobe names it, with the tag for HEVC (`hevc/hvc1`).*/
    video_codec: z
      .union([
        z
          .string()
          .describe(
            "As ffprobe names it, with the tag for HEVC (`hevc/hvc1`).",
          ),
        z
          .null()
          .describe(
            "As ffprobe names it, with the tag for HEVC (`hevc/hvc1`).",
          ),
      ])
      .describe("As ffprobe names it, with the tag for HEVC (`hevc/hvc1`).")
      .default(null),
    audio_codec: z.union([z.string(), z.null()]).default(null),
    /**FileTube's playability rule: original for mp4, m4v and mov with H.264 (HEVC only when tagged hvc1) and for any audio; transcode when the hub must make a playable copy once; none when it cannot. unknown until the probe ran.*/
    playable: z
      .enum(["original", "transcode", "none", "unknown"])
      .describe(
        "FileTube's playability rule: original for mp4, m4v and mov with H.264 (HEVC only when tagged hvc1) and for any audio; transcode when the hub must make a playable copy once; none when it cannot. unknown until the probe ran.",
      ),
    /**A saved picture (a file id) or a path under the item's root (folder art, poster.jpg). Null when there is none.*/
    artwork: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z.null(),
          z
            .object({
              file_id: z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")),
            })
            .strict(),
          z.object({ path: z.string().min(1) }).strict(),
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
        "A saved picture (a file id) or a path under the item's root (folder art, poster.jpg). Null when there is none.",
      )
      .default(null),
    /**Built by the Stack media service (media.preview).*/
    previews: z
      .union([
        z
          .object({
            storyboard_file_id: z
              .union([
                z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")),
                z.null(),
              ])
              .optional(),
            clip_file_id: z
              .union([
                z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")),
                z.null(),
              ])
              .optional(),
          })
          .strict()
          .describe("Built by the Stack media service (media.preview)."),
        z.null().describe("Built by the Stack media service (media.preview)."),
      ])
      .describe("Built by the Stack media service (media.preview).")
      .default(null),
    /**Ordered by start_s. `files` marks chapters that are the files of a folder audiobook.*/
    chapters: z
      .array(
        z
          .object({
            start_s: z.number().gte(0),
            title: z.string().min(1),
            source: z.enum(["manual", "embedded", "description", "files"]),
          })
          .strict(),
      )
      .describe(
        "Ordered by start_s. `files` marks chapters that are the files of a folder audiobook.",
      )
      .default([]),
    subtitles: z
      .array(
        z
          .object({
            lang: z.string().min(2),
            label: z.string().min(1),
            file_id: z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")),
          })
          .strict(),
      )
      .default([]),
    series: z.union([z.string(), z.null()]).default(null),
    season: z.union([z.number().int().gte(0), z.null()]).default(null),
    episode: z.union([z.number().int().gte(0), z.null()]).default(null),
    artist: z.union([z.string(), z.null()]).default(null),
    album: z.union([z.string(), z.null()]).default(null),
    album_artist: z.union([z.string(), z.null()]).default(null),
    track_no: z.union([z.number().int().gte(0), z.null()]).default(null),
    disc_no: z.union([z.number().int().gte(0), z.null()]).default(null),
    year: z.union([z.number().int().gte(0), z.null()]).default(null),
    genre: z.union([z.string(), z.null()]).default(null),
    author: z.union([z.string(), z.null()]).default(null),
    narrator: z.union([z.string(), z.null()]).default(null),
    /**A book's or audiobook's place in its series.*/
    series_index: z
      .union([
        z
          .number()
          .gte(0)
          .describe("A book's or audiobook's place in its series."),
        z.null().describe("A book's or audiobook's place in its series."),
      ])
      .describe("A book's or audiobook's place in its series.")
      .default(null),
    /**How a reader position is kept: an EPUB CFI, a PDF page, or seconds (none).*/
    locator_kind: z
      .enum(["cfi", "page", "none"])
      .describe(
        "How a reader position is kept: an EPUB CFI, a PDF page, or seconds (none).",
      )
      .default("none"),
    /**For anything fetched from the web or read from a feed: the extractor (yt-dlp's name, or `rss` for a podcast guid) and its id.*/
    external: z
      .union([
        z
          .object({
            extractor: z.string().min(1),
            id: z.string().min(1),
            url: z.union([z.string().url(), z.null()]),
            channel_id: z.union([z.string(), z.null()]),
            channel_name: z.union([z.string(), z.null()]),
            published_at: z.union([
              z.string().datetime({ offset: true }),
              z.null(),
            ]),
          })
          .strict()
          .describe(
            "For anything fetched from the web or read from a feed: the extractor (yt-dlp's name, or `rss` for a podcast guid) and its id.",
          ),
        z
          .null()
          .describe(
            "For anything fetched from the web or read from a feed: the extractor (yt-dlp's name, or `rss` for a podcast guid) and its id.",
          ),
      ])
      .describe(
        "For anything fetched from the web or read from a feed: the extractor (yt-dlp's name, or `rss` for a podcast guid) and its id.",
      )
      .default(null),
    /**Explicit content as the file tag, the feed's itunes:explicit, the platform, the classifier or an adult said.*/
    advisory: z
      .object({
        explicit: z.boolean(),
        source: z.enum(["tag", "feed", "platform", "classifier", "adult"]),
      })
      .strict()
      .describe(
        "Explicit content as the file tag, the feed's itunes:explicit, the platform, the classifier or an adult said.",
      )
      .default({ explicit: false, source: "tag" }),
    /**The lowest band that may see the title, description and artwork, computed at ingest (KS-05's band_ok path): adult until the floor passes and nothing marks it explicit; an unverified web item stays adult until an adult marks it.*/
    band_ok: z
      .enum(["child", "teen", "adult"])
      .describe(
        "The lowest band that may see the title, description and artwork, computed at ingest (KS-05's band_ok path): adult until the floor passes and nothing marks it explicit; an unverified web item stays adult until an adult marks it.",
      ),
    /**The adult who marked a web item fine for a lower band, when one did.*/
    verified_by_person_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^person-[a-z0-9]{6,}$"))
          .describe(
            "The adult who marked a web item fine for a lower band, when one did.",
          ),
        z
          .null()
          .describe(
            "The adult who marked a web item fine for a lower band, when one did.",
          ),
      ])
      .describe(
        "The adult who marked a web item fine for a lower band, when one did.",
      )
      .default(null),
    added_at: z.string().datetime({ offset: true }),
    /**`size-mtime` for a root file, the sha256 for a saved copy. The offline status check compares it.*/
    fingerprint: z
      .union([
        z
          .string()
          .describe(
            "`size-mtime` for a root file, the sha256 for a saved copy. The offline status check compares it.",
          ),
        z
          .null()
          .describe(
            "`size-mtime` for a root file, the sha256 for a saved copy. The offline status check compares it.",
          ),
      ])
      .describe(
        "`size-mtime` for a root file, the sha256 for a saved copy. The offline status check compares it.",
      )
      .default(null),
    hidden: z.boolean().default(false),
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
    /**Who wrote it: `hub:scan`, `hub:fetch`, `hub:feed` or `hub:edit`.*/
    provenance: z
      .string()
      .min(1)
      .describe(
        "Who wrote it: `hub:scan`, `hub:fetch`, `hub:feed` or `hub:edit`.",
      ),
  })
  .strict()
  .describe(
    "MEDIA-SPEC-01 (home docs/design/media-apps-blend-2026-10-17.md section 7). One playable or readable thing in the household's media library: a video, a show's episode, a film, a music track, a podcast episode, a book, an audiobook or one chapter of a multi-file audiobook. Household scope; who may see it is band_ok plus the source's visible_to. Identity: one item per (source_id, external.id) for a web item, or per (location.root_id, location.path) for a file on a library root; a re-scan updates, never duplicates.",
  );
export type MediaItem = z.infer<typeof MediaItem>;
