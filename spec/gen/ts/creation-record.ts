// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/creation-record.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**CREATOR-01 (home docs/design/creatoros-port-2026-11-13.md, section 7.2). One record per made item: what it was made from. Written only by a finished job's writer (a picture, clip, film or song that exists as a file), never from a live Studio plan or an autosave (a saved Studio plan is a different record). The made files, the job rows, the production and shot, the route, the cast with their look, the source files with roles, the generation-provenance block (by reference, the one definition of model, engine, seed and tier), the settings and the checks. `words` and `plan` are private to the person who made the item and are NEVER copied into file.provenance.generation (that block stays small and visible to anyone who can open the file); file.provenance keeps only a pointer. audience, made_audience and lock are the maximum over the sources and the parent, written by the same function as the file note.*/
export const CreationRecord = z
  .object({
    id: z.string().regex(new RegExp("^crt-[a-z0-9]{6,}$")),
    version: z.literal(1),
    made_at: z.string().datetime({ offset: true }),
    kind: z.enum(["picture", "video", "film", "reel", "song", "sound", "show"]),
    /**The made files: clip, poster, 5.1 sibling, finished cut. Library file ids only, never paths.*/
    file_ids: z
      .array(z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")))
      .min(1)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "The made files: clip, poster, 5.1 sibling, finished cut. Library file ids only, never paths.",
      ),
    /**The job rows that ran it (picture, video, music, media edit). The job rows stay what they are for running a job.*/
    job_ids: z
      .array(z.string().min(1))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "The job rows that ran it (picture, video, music, media edit). The job rows stay what they are for running a job.",
      )
      .default([]),
    production_id: z
      .union([z.string().regex(new RegExp("^mprd-[a-z0-9]{6,}$")), z.null()])
      .default(null),
    /**The id of the shot inside the production (media-production shot.id).*/
    shot_id: z
      .union([
        z
          .string()
          .min(1)
          .max(80)
          .describe(
            "The id of the shot inside the production (media-production shot.id).",
          ),
        z
          .null()
          .describe(
            "The id of the shot inside the production (media-production shot.id).",
          ),
      ])
      .describe(
        "The id of the shot inside the production (media-production shot.id).",
      )
      .default(null),
    /**The tool and page that made it, and the route.*/
    recipe: z
      .object({
        tool: z.string().min(1).max(80),
        route: z.enum([
          "text",
          "picture",
          "sheet",
          "first_frame",
          "edit",
          "film",
          "other",
        ]),
      })
      .strict()
      .describe("The tool and page that made it, and the route."),
    /**Private to the person who made the item. What the person wrote and the composed prompt. Never copied into file.provenance.generation.*/
    words: z
      .union([
        z
          .object({
            written: z.string().max(20000).optional(),
            composed: z.string().max(20000).optional(),
          })
          .strict()
          .describe(
            "Private to the person who made the item. What the person wrote and the composed prompt. Never copied into file.provenance.generation.",
          ),
        z
          .null()
          .describe(
            "Private to the person who made the item. What the person wrote and the composed prompt. Never copied into file.provenance.generation.",
          ),
      ])
      .describe(
        "Private to the person who made the item. What the person wrote and the composed prompt. Never copied into file.provenance.generation.",
      )
      .default(null),
    /**Private to the person who made the item. The shot plan or film plan: inline up to 12 shots, else the film_run id.*/
    plan: z
      .union([
        z
          .object({
            shots: z.array(z.record(z.string(), z.any())).max(12).optional(),
            film_run_id: z.string().min(1).optional(),
          })
          .strict()
          .describe(
            "Private to the person who made the item. The shot plan or film plan: inline up to 12 shots, else the film_run id.",
          ),
        z
          .null()
          .describe(
            "Private to the person who made the item. The shot plan or film plan: inline up to 12 shots, else the film_run id.",
          ),
      ])
      .describe(
        "Private to the person who made the item. The shot plan or film plan: inline up to 12 shots, else the film_run id.",
      )
      .default(null),
    cast: z
      .array(
        z
          .object({
            subject_id: z.string().regex(new RegExp("^msub-[a-z0-9]{6,}$")),
            synth_id: z
              .union([
                z.string().regex(new RegExp("^[a-z0-9][a-z0-9-]{0,39}$")),
                z.null(),
              ])
              .default(null),
            role: z.string().min(1).max(100),
            /**The look the subject had when it was cast.*/
            look: z
              .object({
                sheet_file_id: z
                  .union([
                    z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")),
                    z.null(),
                  ])
                  .default(null),
                locked_description: z
                  .union([z.string().max(400), z.null()])
                  .default(null),
                pack_id: z.union([z.string().min(1), z.null()]).default(null),
                lora_id: z
                  .union([
                    z.string().regex(new RegExp("^lora-[a-z0-9]{6,}$")),
                    z.null(),
                  ])
                  .default(null),
                strength: z.union([z.number(), z.null()]).default(null),
              })
              .strict()
              .describe("The look the subject had when it was cast.")
              .optional(),
            voice: z.union([z.string().max(500), z.null()]).default(null),
          })
          .strict(),
      )
      .default([]),
    sources: z
      .array(
        z
          .object({
            file_id: z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")),
            role: z.enum([
              "start",
              "end",
              "reference",
              "sheet",
              "edit_source",
              "mask",
              "audio",
              "clip",
            ]),
          })
          .strict(),
      )
      .default([]),
    /**The generation-provenance block: models with licence, engine, seed, tier. By reference, so there is one definition. Holds no words and no plan.*/
    generation: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z
            .object({
              /**What was generated: a song or other music, or a short sound effect or ambience (`sound`, MUSIC-GEN-11). Pictures and videos may adopt this record later. A show is a made episode of a show.*/
              kind: z
                .enum(["music", "sound", "show", "picture", "video", "film"])
                .describe(
                  "What was generated: a song or other music, or a short sound effect or ambience (`sound`, MUSIC-GEN-11). Pictures and videos may adopt this record later. A show is a made episode of a show.",
                ),
              /**The Stack job (stack-job.schema.json) that produced the file.*/
              job_id: z
                .string()
                .min(1)
                .describe(
                  "The Stack job (stack-job.schema.json) that produced the file.",
                ),
              /**What the job did: a new song (text2music), or a change to an existing version (the rest).*/
              task: z
                .enum([
                  "text2music",
                  "cover",
                  "repaint",
                  "extend",
                  "remake",
                  "variation",
                  "trim",
                  "fade",
                  "loudness",
                  "sfx",
                  "generate",
                  "edit",
                  "film",
                ])
                .describe(
                  "What the job did: a new song (text2music), or a change to an existing version (the rest).",
                ),
              /**The weights that made the audio.*/
              model: z
                .object({
                  /**The model's catalog id.*/
                  id: z.string().min(1).describe("The model's catalog id."),
                  /**The exact revision of the weights, such as a commit hash.*/
                  revision: z
                    .string()
                    .describe(
                      "The exact revision of the weights, such as a commit hash.",
                    ),
                  /**SPDX id of the weights' licence, such as MIT.*/
                  licence: z
                    .string()
                    .describe("SPDX id of the weights' licence, such as MIT."),
                })
                .strict()
                .describe("The weights that made the audio."),
              /**The Stack engine that ran the model.*/
              engine: z
                .object({
                  /**The engine id.*/
                  id: z.string().describe("The engine id."),
                  /**The engine version.*/
                  version: z.string().describe("The engine version."),
                })
                .strict()
                .describe("The Stack engine that ran the model."),
              /**The random seed, or null when the task has none (a trim, a fade, a loudness change).*/
              seed: z
                .union([
                  z
                    .number()
                    .int()
                    .describe(
                      "The random seed, or null when the task has none (a trim, a fade, a loudness change).",
                    ),
                  z
                    .null()
                    .describe(
                      "The random seed, or null when the task has none (a trim, a fade, a loudness change).",
                    ),
                ])
                .describe(
                  "The random seed, or null when the task has none (a trim, a fade, a loudness change).",
                ),
              /**Length of the result in seconds.*/
              duration_s: z
                .number()
                .gte(0)
                .describe("Length of the result in seconds."),
              /**Tempo in beats per minute, or null when not set.*/
              bpm: z
                .union([
                  z
                    .number()
                    .int()
                    .gte(30)
                    .lte(300)
                    .describe(
                      "Tempo in beats per minute, or null when not set.",
                    ),
                  z
                    .null()
                    .describe(
                      "Tempo in beats per minute, or null when not set.",
                    ),
                ])
                .describe("Tempo in beats per minute, or null when not set."),
              /**Musical key, for example "C major", or null when not set.*/
              key: z
                .union([
                  z
                    .string()
                    .describe(
                      'Musical key, for example "C major", or null when not set.',
                    ),
                  z
                    .null()
                    .describe(
                      'Musical key, for example "C major", or null when not set.',
                    ),
                ])
                .describe(
                  'Musical key, for example "C major", or null when not set.',
                ),
              /**The version this one was made from; null for a new song.*/
              parent_file_id: z
                .union([
                  z
                    .string()
                    .regex(new RegExp("^file-[a-z0-9]{6,}$"))
                    .describe(
                      "The version this one was made from; null for a new song.",
                    ),
                  z
                    .null()
                    .describe(
                      "The version this one was made from; null for a new song.",
                    ),
                ])
                .describe(
                  "The version this one was made from; null for a new song.",
                ),
              /**Where any input audio came from. "none": no input audio. "made_here": a version made in this household. "upload": reserved and refused today (Home's music design section 9: no uploaded audio until the owner rules).*/
              source_kind: z
                .enum(["none", "made_here", "upload"])
                .describe(
                  'Where any input audio came from. "none": no input audio. "made_here": a version made in this household. "upload": reserved and refused today (Home\'s music design section 9: no uploaded audio until the owner rules).',
                ),
              /**Whether the result may be used commercially, from the model's licence and training-data statement.*/
              commercial_use: z
                .enum(["cleared", "personal_only", "unknown"])
                .describe(
                  "Whether the result may be used commercially, from the model's licence and training-data statement.",
                ),
              /**One sentence naming why commercial_use has the value it has.*/
              commercial_basis: z
                .string()
                .min(1)
                .describe(
                  "One sentence naming why commercial_use has the value it has.",
                ),
              /**When the job finished.*/
              made_at: z
                .string()
                .datetime({ offset: true })
                .describe("When the job finished."),
              /**TIER-SPEC-01. The tier the result was made at. Absent on records made before tiers.*/
              tier: z
                .union([
                  z.literal("reduced"),
                  z.literal("standard"),
                  z.literal("boost"),
                  z.literal("max"),
                  z.literal(null),
                ])
                .describe(
                  "TIER-SPEC-01. The tier the result was made at. Absent on records made before tiers.",
                )
                .optional(),
            })
            .strict()
            .describe(
              "MUSIC-SPEC-01 (Home docs/design/music-generation-2026-10-17.md, sections 8 and 9). How a generated file was made: which Stack job, which task, which model and engine, the seed, the length, the parent version it was made from, and whether the result may be used commercially and why. Carried on file.provenance.generation. The person's own words (description, lyrics, title) are never in this record. Music is the first kind to use it; a show is a made episode of a show. Pictures and videos may adopt it later by adding to the kind enum. CREATOR-01: pictures, videos and films adopt it (kind picture, video, film; task generate, edit, film) as the generation block of a creation record; the words and the plan never go here.",
            ),
          z.null(),
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
        "The generation-provenance block: models with licence, engine, seed, tier. By reference, so there is one definition. Holds no words and no plan.",
      )
      .default(null),
    /**How it was set up.*/
    settings: z
      .object({
        width: z.number().int().gte(1).optional(),
        height: z.number().int().gte(1).optional(),
        seconds: z.number().gte(0).optional(),
        quality: z.string().max(40).optional(),
        styles: z
          .array(
            z
              .object({
                style_id: z.string().regex(new RegExp("^lora-[a-z0-9]{6,}$")),
                strength: z.number().optional(),
              })
              .strict(),
          )
          .optional(),
        /**The camera or shot card values (fragment ids and the palette).*/
        shot_card: z
          .record(z.string(), z.any())
          .describe(
            "The camera or shot card values (fragment ids and the palette).",
          )
          .optional(),
        takes: z.number().int().gte(1).optional(),
        loop: z.boolean().optional(),
        route: z.string().max(80).optional(),
      })
      .strict()
      .describe("How it was set up."),
    /**What the clip check and the face check measured (numbers and findings, never a verdict that a clip is fine).*/
    checks: z
      .union([
        z
          .record(z.string(), z.any())
          .describe(
            "What the clip check and the face check measured (numbers and findings, never a verdict that a clip is fine).",
          ),
        z
          .null()
          .describe(
            "What the clip check and the face check measured (numbers and findings, never a verdict that a clip is fine).",
          ),
      ])
      .describe(
        "What the clip check and the face check measured (numbers and findings, never a verdict that a clip is fine).",
      )
      .default(null),
    /**The record this one was made from: another take, re-shoot, next shot, edit. Follows media-item.parent_id.*/
    parent_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^crt-[a-z0-9]{6,}$"))
          .describe(
            "The record this one was made from: another take, re-shoot, next shot, edit. Follows media-item.parent_id.",
          ),
        z
          .null()
          .describe(
            "The record this one was made from: another take, re-shoot, next shot, edit. Follows media-item.parent_id.",
          ),
      ])
      .describe(
        "The record this one was made from: another take, re-shoot, next shot, edit. Follows media-item.parent_id.",
      )
      .default(null),
    /**The one review state the film grade, the takes and the clip check's re-shoot rule read. A rejected take is marked, never deleted.*/
    review: z
      .enum(["pending", "kept", "rejected"])
      .describe(
        "The one review state the film grade, the takes and the clip check's re-shoot rule read. A rejected take is marked, never deleted.",
      ),
    audience: z.enum(["all-ages", "adult-only"]).default("all-ages"),
    /**Same meaning as file.made_audience.*/
    made_audience: z
      .enum(["all-ages", "adult-only"])
      .describe("Same meaning as file.made_audience.")
      .default("all-ages"),
    /**Same meaning as file.lock. Never on while made_audience is all-ages.*/
    lock: z
      .enum(["on", "off"])
      .describe(
        "Same meaning as file.lock. Never on while made_audience is all-ages.",
      )
      .default("off"),
    provenance: z.string().min(1),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe(
    "CREATOR-01 (home docs/design/creatoros-port-2026-11-13.md, section 7.2). One record per made item: what it was made from. Written only by a finished job's writer (a picture, clip, film or song that exists as a file), never from a live Studio plan or an autosave (a saved Studio plan is a different record). The made files, the job rows, the production and shot, the route, the cast with their look, the source files with roles, the generation-provenance block (by reference, the one definition of model, engine, seed and tier), the settings and the checks. `words` and `plan` are private to the person who made the item and are NEVER copied into file.provenance.generation (that block stays small and visible to anyone who can open the file); file.provenance keeps only a pointer. audience, made_audience and lock are the maximum over the sources and the parent, written by the same function as the file note.",
  );
export type CreationRecord = z.infer<typeof CreationRecord>;
