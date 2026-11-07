// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/show-format.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

export const ShowFormat = z
  .object({
    id: z.string().regex(new RegExp("^[a-z_]+$")),
    label: z.string().max(40),
    parts: z
      .array(
        z
          .object({
            id: z.string(),
            label: z.string(),
            min: z.number().int().gte(0),
            max: z.number().int().gte(0),
            leads: z.boolean(),
            dials: z
              .object({
                formality: z.enum(["casual", "neutral", "formal"]).optional(),
                complexity: z
                  .enum(["simple", "standard", "advanced"])
                  .optional(),
                engagement: z.enum(["brief", "balanced", "curious"]).optional(),
                filler_density: z
                  .enum(["none", "light", "frequent"])
                  .optional(),
                clock_style: z.enum(["formal", "plain", "loose"]).optional(),
                hedging: z.enum(["low", "medium", "high"]).optional(),
                social: z
                  .object({
                    humor: z.enum(["low", "medium", "high"]).optional(),
                    warmth: z.enum(["low", "medium", "high"]).optional(),
                    initiative: z.enum(["low", "medium", "high"]).optional(),
                  })
                  .strict()
                  .optional(),
              })
              .strict(),
          })
          .strict(),
      )
      .min(1),
    structure: z
      .array(
        z
          .object({
            kind: z.enum(["hook", "intro", "segment", "exchange", "closing"]),
            share: z.number().gt(0).lte(1),
            repeat: z.boolean().default(false),
          })
          .strict(),
      )
      .min(1),
    length_s: z
      .object({
        min: z.number().int(),
        default: z.number().int(),
        max: z.number().int(),
      })
      .strict(),
    talk_over: z.enum(["none", "light", "lively", "heated"]),
    gap_ms: z.number().int().gte(0).lte(2000),
    sources_allowed: z.array(
      z.enum([
        "news",
        "weather",
        "household",
        "documents",
        "media_item",
        "bookmarks",
      ]),
    ),
    min_audience: z.enum(["all", "teen", "adult"]),
    substitute: z.enum(["stand_in", "skip"]),
    stingers: z.boolean(),
    words_per_minute: z.number().int().gte(100).lte(220),
    first_app: z.string(),
  })
  .strict();
export type ShowFormat = z.infer<typeof ShowFormat>;
