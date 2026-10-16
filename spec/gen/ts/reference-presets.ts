// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/reference-presets.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

export const Referencelibrarypresets = z
  .object({
    $comment: z.string().min(1),
    custom_note: z.string().min(1),
    presets: z
      .array(
        z
          .object({
            id: z.enum(["full", "moderate", "minimum"]),
            label: z.string().min(1),
            copy: z.string().min(1).max(90),
            help: z.string().min(1),
            approx_gb: z.number().gt(0),
            members: z.array(
              z
                .object({
                  source: z.enum([
                    "vikidia",
                    "wikipedia-simple",
                    "wikipedia-en",
                    "wiktionary-simple",
                    "wiktionary-en",
                    "wikivoyage",
                    "wikibooks",
                    "world-factbook",
                    "medlineplus",
                    "stackexchange",
                  ]),
                  flavour: z.enum(["mini", "maxi", "nopic", "default"]),
                  bands: z
                    .array(z.enum(["child", "teen", "adult"]))
                    .min(1)
                    .refine(
                      (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                      "All items must be unique!",
                    ),
                  adults_only: z.literal(true).optional(),
                })
                .strict(),
            ),
            settings: z.record(
              z.string(),
              z.union([z.string(), z.number(), z.boolean()]),
            ),
          })
          .strict(),
      )
      .min(3)
      .max(3),
  })
  .strict();
export type Referencelibrarypresets = z.infer<typeof Referencelibrarypresets>;
