// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/made-album.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MUSIC-STUDIO-ALBUM. An album the household made here: a title, the made band it belongs to, the sound every track reuses, a cover and the ordered tracks. A track is a normal made song (a media-item whose `made_artist_id` is the band), so the album only lists their ids in play order; there is no second copy of a song. It holds the SAME shared `style` and `seed` definitions as song-style and made-artist (one definition each), and may name a saved SongStyle it started from. Person scope, always labelled 'Made here'. Title and blurb are a person's own words and are never logged (rule 6a). The cover is a picture made from `cover_seed`: the same seed and look make the same cover, a new seed makes a new one.*/
export const MadeAlbum = z
  .object({
    /**Stable id, never reused.*/
    id: z
      .string()
      .regex(new RegExp("^malbum-[a-z0-9]{6,}$"))
      .describe("Stable id, never reused."),
    /**The album's title. Trimmed; not unique.*/
    title: z
      .string()
      .min(1)
      .max(120)
      .describe("The album's title. Trimmed; not unique."),
    /**Always made: an album found in the library is a media-item album, not this record.*/
    origin: z
      .literal("made")
      .describe(
        "Always made: an album found in the library is a media-item album, not this record.",
      ),
    /**Who made the album.*/
    owner_person_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^person-[a-z0-9]{6,}$"))
          .describe("Who made the album."),
        z.null().describe("Who made the album."),
      ])
      .describe("Who made the album.")
      .default(null),
    /**The made band the album belongs to; null for an album of mixed artists.*/
    made_artist_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^mband-[a-z0-9]{6,}$"))
          .describe(
            "The made band the album belongs to; null for an album of mixed artists.",
          ),
        z
          .null()
          .describe(
            "The made band the album belongs to; null for an album of mixed artists.",
          ),
      ])
      .describe(
        "The made band the album belongs to; null for an album of mixed artists.",
      )
      .default(null),
    /**The saved SongStyle the album started from, if any. `style` is the album's own copy and wins.*/
    song_style_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^sstyle-[a-z0-9]{6,}$"))
          .describe(
            "The saved SongStyle the album started from, if any. `style` is the album's own copy and wins.",
          ),
        z
          .null()
          .describe(
            "The saved SongStyle the album started from, if any. `style` is the album's own copy and wins.",
          ),
      ])
      .describe(
        "The saved SongStyle the album started from, if any. `style` is the album's own copy and wins.",
      )
      .default(null),
    /**A short plain-text description for the album page. Never HTML. Passes the same output gate as chat before it is stored (rule 10).*/
    blurb: z
      .string()
      .max(1000)
      .describe(
        "A short plain-text description for the album page. Never HTML. Passes the same output gate as chat before it is stored (rule 10).",
      )
      .default(""),
    /**The words the cover picture is made from (what it should look like).*/
    look: z
      .string()
      .max(1000)
      .describe(
        "The words the cover picture is made from (what it should look like).",
      )
      .default(""),
    /**The cover picture.*/
    cover_file_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^file-[a-z0-9]{6,}$"))
          .describe("The cover picture."),
        z.null().describe("The cover picture."),
      ])
      .describe("The cover picture.")
      .default(null),
    /**The picture seed of the cover. Remaking the cover picks a new one.*/
    cover_seed: z
      .union([
        z
          .number()
          .int()
          .gte(0)
          .lte(4294967295)
          .describe(
            "The picture seed of the cover. Remaking the cover picks a new one.",
          ),
        z
          .null()
          .describe(
            "The picture seed of the cover. Remaking the cover picks a new one.",
          ),
      ])
      .describe(
        "The picture seed of the cover. Remaking the cover picks a new one.",
      )
      .default(null),
    /**The tracks in play order, as media-item ids. Removing a track here does not delete the song.*/
    track_media_ids: z
      .array(z.string().regex(new RegExp("^media-[a-z0-9]{6,}$")))
      .max(100)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "The tracks in play order, as media-item ids. Removing a track here does not delete the song.",
      )
      .default([]),
    /**The ONE style shape. SongStyle holds one; MadeArtist holds one that every track of the band reuses. Words only: never lyrics.*/
    style: z
      .object({
        /**The style words handed to the song engine (genre, mood, instruments, era). Never lyrics.*/
        description: z
          .string()
          .min(1)
          .max(1000)
          .describe(
            "The style words handed to the song engine (genre, mood, instruments, era). Never lyrics.",
          ),
        /**Short genre words, for browsing and for the band's page.*/
        genres: z
          .array(z.string().min(1).max(40))
          .max(8)
          .refine(
            (arr) => arr.every((item, i) => arr.indexOf(item) == i),
            "All items must be unique!",
          )
          .describe("Short genre words, for browsing and for the band's page.")
          .default([]),
        instrumental: z.boolean().default(false),
        /**Wanted length in seconds; null lets the engine choose.*/
        length_s: z
          .union([
            z
              .number()
              .int()
              .gte(5)
              .lte(600)
              .describe(
                "Wanted length in seconds; null lets the engine choose.",
              ),
            z
              .null()
              .describe(
                "Wanted length in seconds; null lets the engine choose.",
              ),
          ])
          .describe("Wanted length in seconds; null lets the engine choose.")
          .default(null),
        bpm: z
          .union([z.number().int().gte(30).lte(300), z.null()])
          .default(null),
        /**For example 'A minor' or 'F# major'.*/
        key: z
          .union([
            z
              .string()
              .regex(new RegExp("^[A-G][#b]? ?(major|minor|maj|min|m)?$"))
              .describe("For example 'A minor' or 'F# major'."),
            z.null().describe("For example 'A minor' or 'F# major'."),
          ])
          .describe("For example 'A minor' or 'F# major'.")
          .default(null),
        /**A BCP 47 tag for the sung language; null lets the engine choose.*/
        language: z
          .union([
            z
              .string()
              .regex(new RegExp("^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$"))
              .describe(
                "A BCP 47 tag for the sung language; null lets the engine choose.",
              ),
            z
              .null()
              .describe(
                "A BCP 47 tag for the sung language; null lets the engine choose.",
              ),
          ])
          .describe(
            "A BCP 47 tag for the sung language; null lets the engine choose.",
          )
          .default(null),
      })
      .strict()
      .describe(
        "The ONE style shape. SongStyle holds one; MadeArtist holds one that every track of the band reuses. Words only: never lyrics.",
      ),
    /**The ONE field that says what a style or a band was made 'like': a file made here (a song the household made) or a library item (a track the household holds). An input description only: the original audio is never sent to the engine (voice, cover and edit sources stay closed, MUSIC-GEN-14), and the seed's lyrics, melody and voice are never copied. Exactly one of the two ids; the property that holds it is null when there is none.*/
    seed: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z.null(),
          z
            .object({
              /**A song made here (a file with origin made).*/
              file_id: z
                .string()
                .regex(new RegExp("^file-[a-z0-9]{6,}$"))
                .describe("A song made here (a file with origin made)."),
            })
            .strict(),
          z
            .object({
              /**A library media-item (a track).*/
              media_id: z
                .string()
                .regex(new RegExp("^media-[a-z0-9]{6,}$"))
                .describe("A library media-item (a track)."),
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
        "The ONE field that says what a style or a band was made 'like': a file made here (a song the household made) or a library item (a track the household holds). An input description only: the original audio is never sent to the engine (voice, cover and edit sources stay closed, MUSIC-GEN-14), and the seed's lyrics, melody and voice are never copied. Exactly one of the two ids; the property that holds it is null when there is none.",
      )
      .default(null),
    /**Null is private. 'household' shares with everyone in the household; a list shares with those people. A child's records are never shared outside the household.*/
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
        "Null is private. 'household' shares with everyone in the household; a list shares with those people. A child's records are never shared outside the household.",
      )
      .default(null),
    /**hub: authoritative on the hub. local: made on a robot, not yet synced.*/
    source: z
      .enum(["hub", "local"])
      .describe(
        "hub: authoritative on the hub. local: made on a robot, not yet synced.",
      ),
    /**Free text naming who made the album, for example 'person-a1b2c3 (self)'.*/
    provenance: z
      .string()
      .min(1)
      .describe(
        "Free text naming who made the album, for example 'person-a1b2c3 (self)'.",
      ),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Set when the album is deleted, so a syncing client drops it. Its tracks stay as songs.*/
    deleted_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "Set when the album is deleted, so a syncing client drops it. Its tracks stay as songs.",
          ),
        z
          .null()
          .describe(
            "Set when the album is deleted, so a syncing client drops it. Its tracks stay as songs.",
          ),
      ])
      .describe(
        "Set when the album is deleted, so a syncing client drops it. Its tracks stay as songs.",
      )
      .default(null),
  })
  .strict()
  .describe(
    "MUSIC-STUDIO-ALBUM. An album the household made here: a title, the made band it belongs to, the sound every track reuses, a cover and the ordered tracks. A track is a normal made song (a media-item whose `made_artist_id` is the band), so the album only lists their ids in play order; there is no second copy of a song. It holds the SAME shared `style` and `seed` definitions as song-style and made-artist (one definition each), and may name a saved SongStyle it started from. Person scope, always labelled 'Made here'. Title and blurb are a person's own words and are never logged (rule 6a). The cover is a picture made from `cover_seed`: the same seed and look make the same cover, a new seed makes a new one.",
  );
export type MadeAlbum = z.infer<typeof MadeAlbum>;
