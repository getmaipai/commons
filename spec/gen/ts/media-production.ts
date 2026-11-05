// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-production.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MEDIA-01. A private, shareable container for kind-agnostic media production: cast roles, sets, props, script structure, source media and finished cuts.*/
export const MediaProduction = z
  .object({
    id: z.string().regex(new RegExp("^mprd-[a-z0-9]{6,}$")),
    title: z.string().min(1).max(160),
    summary: z.string().max(2000).default(""),
    owner_person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    shared_to: z
      .array(z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .default([]),
    cast: z
      .array(
        z
          .object({
            subject_id: z.string().regex(new RegExp("^msub-[a-z0-9]{6,}$")),
            role: z.string().min(1).max(100),
            wardrobe_variant_ids: z
              .array(z.string().regex(new RegExp("^msub-[a-z0-9]{6,}$")))
              .default([]),
            voice_choice: z
              .union([z.string().max(500), z.null()])
              .default(null),
            notes: z.string().max(2000).default(""),
          })
          .strict(),
      )
      .default([]),
    sets: z
      .array(z.string().regex(new RegExp("^msub-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .default([]),
    props: z
      .array(z.string().regex(new RegExp("^msub-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .default([]),
    episodes: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            title: z.string().max(160).optional(),
            scenes: z
              .array(
                z
                  .object({
                    id: z.string().min(1).max(80),
                    title: z.string().max(160).optional(),
                    shots: z
                      .array(
                        z
                          .object({
                            id: z.string().min(1).max(80),
                            subject_ids: z
                              .array(
                                z
                                  .string()
                                  .regex(new RegExp("^msub-[a-z0-9]{6,}$")),
                              )
                              .refine(
                                (arr) =>
                                  arr.every(
                                    (item, i) => arr.indexOf(item) == i,
                                  ),
                                "All items must be unique!",
                              ),
                            clip_file_id: z
                              .union([
                                z
                                  .string()
                                  .regex(new RegExp("^file-[a-z0-9]{6,}$")),
                                z.null(),
                              ])
                              .default(null),
                            picture_file_id: z
                              .union([
                                z
                                  .string()
                                  .regex(new RegExp("^file-[a-z0-9]{6,}$")),
                                z.null(),
                              ])
                              .default(null),
                            music_line_id: z
                              .union([
                                z
                                  .string()
                                  .regex(
                                    new RegExp("^musicline-[a-z0-9]{6,}$"),
                                  ),
                                z.null(),
                              ])
                              .default(null),
                            voice_line_id: z
                              .union([
                                z
                                  .string()
                                  .regex(
                                    new RegExp("^voiceline-[a-z0-9]{6,}$"),
                                  ),
                                z.null(),
                              ])
                              .default(null),
                          })
                          .strict(),
                      )
                      .default([]),
                  })
                  .strict(),
              )
              .default([]),
          })
          .strict(),
      )
      .default([]),
    clip_file_ids: z
      .array(z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .default([]),
    picture_file_ids: z
      .array(z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .default([]),
    music_line_ids: z
      .array(z.string().regex(new RegExp("^musicline-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .default([]),
    voice_line_ids: z
      .array(z.string().regex(new RegExp("^voiceline-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .default([]),
    finished_cut_file_ids: z
      .array(z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .default([]),
    provenance: z.string().min(1),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe(
    "MEDIA-01. A private, shareable container for kind-agnostic media production: cast roles, sets, props, script structure, source media and finished cuts.",
  );
export type MediaProduction = z.infer<typeof MediaProduction>;
