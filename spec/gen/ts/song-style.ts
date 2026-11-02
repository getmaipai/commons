// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/song-style.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MUSIC-STUDIO-S2. A saved way a song should sound: the style words and a few knobs, never lyrics. It is the one 'make one like this' shape: the starter shelf, a made song's 'Make one like this' and 'Create a song like this' (MUSIC-LIKE-01) all produce one, and a made band (made-artist) holds the same `style` shape for every track it makes. Person scope; `origin` says whether MaiPai ships it or the household saved it. The style words are a person's own words, so a hub never logs them (rule 6a). Lyrics are never stored here and a seed's lyrics, melody or voice are never copied.*/
export const SongStyle = z
  .object({
    /**Stable id, never reused.*/
    id: z
      .string()
      .regex(new RegExp("^sstyle-[a-z0-9]{6,}$"))
      .describe("Stable id, never reused."),
    /**What the person calls this style. Trimmed; not unique.*/
    title: z
      .string()
      .min(1)
      .max(80)
      .describe("What the person calls this style. Trimmed; not unique."),
    /**starter: ships with Music. household: a person saved it.*/
    origin: z
      .enum(["starter", "household"])
      .describe("starter: ships with Music. household: a person saved it."),
    /**Whose style this is; null for a starter.*/
    owner_person_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^person-[a-z0-9]{6,}$"))
          .describe("Whose style this is; null for a starter."),
        z.null().describe("Whose style this is; null for a starter."),
      ])
      .describe("Whose style this is; null for a starter.")
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
    /**Free text naming who made the record, for example 'person-a1b2c3 (self)' or 'starter'.*/
    provenance: z
      .string()
      .min(1)
      .describe(
        "Free text naming who made the record, for example 'person-a1b2c3 (self)' or 'starter'.",
      ),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Set when the style is deleted, so a syncing client drops it.*/
    deleted_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "Set when the style is deleted, so a syncing client drops it.",
          ),
        z
          .null()
          .describe(
            "Set when the style is deleted, so a syncing client drops it.",
          ),
      ])
      .describe("Set when the style is deleted, so a syncing client drops it.")
      .default(null),
  })
  .strict()
  .describe(
    "MUSIC-STUDIO-S2. A saved way a song should sound: the style words and a few knobs, never lyrics. It is the one 'make one like this' shape: the starter shelf, a made song's 'Make one like this' and 'Create a song like this' (MUSIC-LIKE-01) all produce one, and a made band (made-artist) holds the same `style` shape for every track it makes. Person scope; `origin` says whether MaiPai ships it or the household saved it. The style words are a person's own words, so a hub never logs them (rule 6a). Lyrics are never stored here and a seed's lyrics, melody or voice are never copied.",
  );
export type SongStyle = z.infer<typeof SongStyle>;
