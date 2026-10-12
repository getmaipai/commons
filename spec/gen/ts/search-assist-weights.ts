// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/search-assist-weights.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Manifest of the search-assist head's weights (ROUTER-BUILD-01a): a logistic head over the utterance embedding. Home refuses to score when the embed identity differs from what the Stack embed role reports. Inference is a dot product; no text is stored here.*/
export const SearchAssistWeights = z
  .object({
    embed: z
      .object({
        model: z.string().min(1),
        dims: z.number().int().gte(1),
        /**Name of the preprocess applied before embedding, matching Home's EMBED_PREPROCESS.*/
        preprocess: z
          .string()
          .min(1)
          .describe(
            "Name of the preprocess applied before embedding, matching Home's EMBED_PREPROCESS.",
          ),
        /**Text prefix added before embedding; empty string for raw.*/
        prefix: z
          .string()
          .describe(
            "Text prefix added before embedding; empty string for raw.",
          ),
      })
      .strict(),
    features: z.enum(["alone", "pair", "concat"]),
    classes: z
      .array(z.string().min(1))
      .min(2)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      ),
    /**One row per class (one row for a binary head, as scikit-learn exports it), one column per feature.*/
    coef: z
      .array(z.array(z.number()).min(1))
      .min(1)
      .describe(
        "One row per class (one row for a binary head, as scikit-learn exports it), one column per feature.",
      ),
    intercept: z.array(z.number()).min(1),
    /**Per-tool score threshold, keyed by tool name.*/
    thresholds: z
      .record(z.string(), z.number().gte(0).lte(1))
      .describe("Per-tool score threshold, keyed by tool name."),
    /**The turn-label schema version the head was trained against.*/
    label_spec_version: z
      .string()
      .min(1)
      .describe("The turn-label schema version the head was trained against."),
    dataset_sha256: z.string().regex(new RegExp("^[0-9a-f]{64}$")),
    /**Where the bench numbers for this head are recorded.*/
    bench_record: z
      .string()
      .min(1)
      .describe("Where the bench numbers for this head are recorded."),
  })
  .strict()
  .describe(
    "Manifest of the search-assist head's weights (ROUTER-BUILD-01a): a logistic head over the utterance embedding. Home refuses to score when the embed identity differs from what the Stack embed role reports. Inference is a dot product; no text is stored here.",
  );
export type SearchAssistWeights = z.infer<typeof SearchAssistWeights>;
