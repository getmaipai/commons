// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/made-artist.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MUSIC-LISTEN-C5. A band or artist the household made here: name, back story, members, portrait and logo, and the `style` every track of the band reuses so an album sounds like one band. Only what a media-item cannot hold gets this record: a track is a normal made song whose `artist` text is the band's name, and an album is a media-collection, so there is no album record here. Person scope, always labelled 'Made here'. Fictional by default (the creator's prompt asks for a fictional band and fictional people); that is a default, not a block for an adult. Names, back story and member names are a person's words and are never logged (rule 6a). A band made 'like' a playing track keeps that track as its `seed`; the new band's own name, members, back story and lyrics are never a copy of it.*/
export const MadeArtist = z
  .object({
    /**Stable id, never reused.*/
    id: z
      .string()
      .regex(new RegExp("^mband-[a-z0-9]{6,}$"))
      .describe("Stable id, never reused."),
    /**The band's name, as shown and as written on each track's artist field. Trimmed; not unique.*/
    name: z
      .string()
      .min(1)
      .max(120)
      .describe(
        "The band's name, as shown and as written on each track's artist field. Trimmed; not unique.",
      ),
    /**Always made: a band found in the library is a media-item artist, not this record.*/
    origin: z
      .literal("made")
      .describe(
        "Always made: a band found in the library is a media-item artist, not this record.",
      ),
    /**Who made the band.*/
    owner_person_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^person-[a-z0-9]{6,}$"))
          .describe("Who made the band."),
        z.null().describe("Who made the band."),
      ])
      .describe("Who made the band.")
      .default(null),
    /**Plain text, never HTML. Passes the same output gate as chat before it is stored (rule 10).*/
    backstory: z
      .string()
      .max(4000)
      .describe(
        "Plain text, never HTML. Passes the same output gate as chat before it is stored (rule 10).",
      )
      .default(""),
    /**Genre words for the band's page and for browsing.*/
    genres: z
      .array(z.string().min(1).max(40))
      .max(8)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe("Genre words for the band's page and for browsing.")
      .default([]),
    members: z
      .array(
        z
          .object({
            name: z.string().min(1).max(80),
            /**For example 'vocals' or 'drums'.*/
            role: z
              .string()
              .min(1)
              .max(60)
              .describe("For example 'vocals' or 'drums'."),
            portrait_file_id: z
              .union([
                z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")),
                z.null(),
              ])
              .default(null),
            synth_id: z
              .union([
                z.string().regex(new RegExp("^[a-z0-9][a-z0-9-]{0,39}$")),
                z.null(),
              ])
              .default(null),
          })
          .strict(),
      )
      .max(12)
      .default([]),
    /**The band picture.*/
    portrait_file_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^file-[a-z0-9]{6,}$"))
          .describe("The band picture."),
        z.null().describe("The band picture."),
      ])
      .describe("The band picture.")
      .default(null),
    logo_file_id: z
      .union([z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")), z.null()])
      .default(null),
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
    /**Free text naming who made the band, for example 'person-a1b2c3 (self)'.*/
    provenance: z
      .string()
      .min(1)
      .describe(
        "Free text naming who made the band, for example 'person-a1b2c3 (self)'.",
      ),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Set when the band is deleted, so a syncing client drops it. Its tracks stay as songs.*/
    deleted_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "Set when the band is deleted, so a syncing client drops it. Its tracks stay as songs.",
          ),
        z
          .null()
          .describe(
            "Set when the band is deleted, so a syncing client drops it. Its tracks stay as songs.",
          ),
      ])
      .describe(
        "Set when the band is deleted, so a syncing client drops it. Its tracks stay as songs.",
      )
      .default(null),
  })
  .strict()
  .describe(
    "MUSIC-LISTEN-C5. A band or artist the household made here: name, back story, members, portrait and logo, and the `style` every track of the band reuses so an album sounds like one band. Only what a media-item cannot hold gets this record: a track is a normal made song whose `artist` text is the band's name, and an album is a media-collection, so there is no album record here. Person scope, always labelled 'Made here'. Fictional by default (the creator's prompt asks for a fictional band and fictional people); that is a default, not a block for an adult. Names, back story and member names are a person's words and are never logged (rule 6a). A band made 'like' a playing track keeps that track as its `seed`; the new band's own name, members, back story and lyrics are never a copy of it.",
  );
export type MadeArtist = z.infer<typeof MadeArtist>;
