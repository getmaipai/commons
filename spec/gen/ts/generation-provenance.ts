// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/generation-provenance.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MUSIC-SPEC-01 (Home docs/design/music-generation-2026-10-17.md, sections 8 and 9). How a generated file was made: which Stack job, which task, which model and engine, the seed, the length, the parent version it was made from, and whether the result may be used commercially and why. Carried on file.provenance.generation. The person's own words (description, lyrics, title) are never in this record. Music is the first kind to use it; pictures and videos may adopt it later by adding to the kind enum.*/
export const GenerationProvenance = z
  .object({
    /**What was generated. Only music today; pictures and videos may adopt this record later.*/
    kind: z
      .literal("music")
      .describe(
        "What was generated. Only music today; pictures and videos may adopt this record later.",
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
    duration_s: z.number().gte(0).describe("Length of the result in seconds."),
    /**Tempo in beats per minute, or null when not set.*/
    bpm: z
      .union([
        z
          .number()
          .int()
          .gte(30)
          .lte(300)
          .describe("Tempo in beats per minute, or null when not set."),
        z.null().describe("Tempo in beats per minute, or null when not set."),
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
      .describe('Musical key, for example "C major", or null when not set.'),
    /**The version this one was made from; null for a new song.*/
    parent_file_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^file-[a-z0-9]{6,}$"))
          .describe("The version this one was made from; null for a new song."),
        z
          .null()
          .describe("The version this one was made from; null for a new song."),
      ])
      .describe("The version this one was made from; null for a new song."),
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
      .describe("One sentence naming why commercial_use has the value it has."),
    /**When the job finished.*/
    made_at: z
      .string()
      .datetime({ offset: true })
      .describe("When the job finished."),
  })
  .strict()
  .describe(
    "MUSIC-SPEC-01 (Home docs/design/music-generation-2026-10-17.md, sections 8 and 9). How a generated file was made: which Stack job, which task, which model and engine, the seed, the length, the parent version it was made from, and whether the result may be used commercially and why. Carried on file.provenance.generation. The person's own words (description, lyrics, title) are never in this record. Music is the first kind to use it; pictures and videos may adopt it later by adding to the kind enum.",
  );
export type GenerationProvenance = z.infer<typeof GenerationProvenance>;
