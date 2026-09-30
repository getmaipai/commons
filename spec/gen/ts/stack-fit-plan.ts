// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/stack-fit-plan.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The Stack's answer to would this model fit this machine at this context, and what would it take. A wire record from the Stack to Home, never stored. Home words it for a person.*/
export const StackFitPlan = z
  .object({
    schema: z.literal(1),
    model: z.string().min(1),
    context_tokens: z.number().int().gt(0),
    /**Element type of the KV cache (the per-token attention memory) for llama.cpp-family engines. f16 is the default. q8_0 and q4_0 are block-quantized (34 bytes per 32 elements and 18 bytes per 32 elements, respectively).*/
    kv_cache_type: z
      .enum(["f16", "q8_0", "q4_0"])
      .describe(
        "Element type of the KV cache (the per-token attention memory) for llama.cpp-family engines. f16 is the default. q8_0 and q4_0 are block-quantized (34 bytes per 32 elements and 18 bytes per 32 elements, respectively).",
      ),
    roles: z.array(
      z
        .object({
          /**Matches backend/src/lib/llm.ts's LlmRole, with one addition ahead of that hub code: turn-signal (SPEC-01, dev.md section 12 part 2, the small classifier heads over the turn's existing embedding that ACT-02 fetches on demand, not wired to a real backend yet, same as image/video below). A code review on this migration caught the original wording claiming an exact match already - ACT-02 is what adds turn-signal to LlmRole itself; this is spec-only, declared here first per the migration's own no-hub-code scope.*/
          role: z
            .enum([
              "chat",
              "router",
              "embed",
              "vision",
              "image",
              "video",
              "coding",
              "tts",
              "stt",
              "wakeword",
              "turn-signal",
            ])
            .describe(
              "Matches backend/src/lib/llm.ts's LlmRole, with one addition ahead of that hub code: turn-signal (SPEC-01, dev.md section 12 part 2, the small classifier heads over the turn's existing embedding that ACT-02 fetches on demand, not wired to a real backend yet, same as image/video below). A code review on this migration caught the original wording claiming an exact match already - ACT-02 is what adds turn-signal to LlmRole itself; this is spec-only, declared here first per the migration's own no-hub-code scope.",
            ),
          choice: z.string().min(1),
          /**Bytes; a range with its source and date, never a bare number; unknown is a first-class answer and is never filled with a guess.*/
          peak: z
            .union([
              z
                .object({
                  low: z.number().int().gte(0),
                  high: z.number().int().gte(0),
                  source: z.enum(["measured", "dry-run", "estimated"]),
                  as_of: z.string().date(),
                })
                .strict(),
              z
                .object({
                  low: z.null(),
                  high: z.null(),
                  source: z.literal("unknown"),
                  as_of: z.string().date(),
                })
                .strict(),
            ])
            .describe(
              "Bytes; a range with its source and date, never a bare number; unknown is a first-class answer and is never filled with a guess.",
            ),
        })
        .strict(),
    ),
    /**Bytes; a range with its source and date, never a bare number; unknown is a first-class answer and is never filled with a guess.*/
    total: z
      .union([
        z
          .object({
            low: z.number().int().gte(0),
            high: z.number().int().gte(0),
            source: z.enum(["measured", "dry-run", "estimated"]),
            as_of: z.string().date(),
          })
          .strict(),
        z
          .object({
            low: z.null(),
            high: z.null(),
            source: z.literal("unknown"),
            as_of: z.string().date(),
          })
          .strict(),
      ])
      .describe(
        "Bytes; a range with its source and date, never a bare number; unknown is a first-class answer and is never filled with a guess.",
      ),
    /**Bytes; a range with its source and date, never a bare number; unknown is a first-class answer and is never filled with a guess.*/
    cap: z
      .union([
        z
          .object({
            low: z.number().int().gte(0),
            high: z.number().int().gte(0),
            source: z.enum(["measured", "dry-run", "estimated"]),
            as_of: z.string().date(),
          })
          .strict(),
        z
          .object({
            low: z.null(),
            high: z.null(),
            source: z.literal("unknown"),
            as_of: z.string().date(),
          })
          .strict(),
      ])
      .describe(
        "Bytes; a range with its source and date, never a bare number; unknown is a first-class answer and is never filled with a guess.",
      ),
    /**Bytes; a range with its source and date, never a bare number; unknown is a first-class answer and is never filled with a guess.*/
    margin: z
      .union([
        z
          .object({
            low: z.number().int().gte(0),
            high: z.number().int().gte(0),
            source: z.enum(["measured", "dry-run", "estimated"]),
            as_of: z.string().date(),
          })
          .strict(),
        z
          .object({
            low: z.null(),
            high: z.null(),
            source: z.literal("unknown"),
            as_of: z.string().date(),
          })
          .strict(),
      ])
      .describe(
        "Bytes; a range with its source and date, never a bare number; unknown is a first-class answer and is never filled with a guess.",
      ),
    paths: z
      .array(
        z
          .object({
            path: z.enum(["unified", "gpu", "multi-gpu", "cpu-offload", "cpu"]),
            fits: z.boolean(),
            /**slow means the cpu-offload path is the only one that fits; unknown means no measured record, dry run or verified architecture exists for this model.*/
            verdict: z
              .enum(["yes", "slow", "no", "unknown"])
              .describe(
                "slow means the cpu-offload path is the only one that fits; unknown means no measured record, dry run or verified architecture exists for this model.",
              ),
            /**Extra bytes needed for the smallest quantization to fit; absent when it fits.*/
            shortfall: z
              .union([
                z
                  .object({
                    low: z.number().int().gte(0),
                    high: z.number().int().gte(0),
                    source: z.enum(["measured", "dry-run", "estimated"]),
                    as_of: z.string().date(),
                  })
                  .strict(),
                z
                  .object({
                    low: z.null(),
                    high: z.null(),
                    source: z.literal("unknown"),
                    as_of: z.string().date(),
                  })
                  .strict(),
              ])
              .describe(
                "Extra bytes needed for the smallest quantization to fit; absent when it fits.",
              )
              .optional(),
          })
          .strict(),
      )
      .min(1),
    /**slow means the cpu-offload path is the only one that fits; unknown means no measured record, dry run or verified architecture exists for this model.*/
    verdict: z
      .enum(["yes", "slow", "no", "unknown"])
      .describe(
        "slow means the cpu-offload path is the only one that fits; unknown means no measured record, dry run or verified architecture exists for this model.",
      ),
    bottleneck: z.enum(["memory", "disk", "context", "unknown"]),
  })
  .strict()
  .describe(
    "The Stack's answer to would this model fit this machine at this context, and what would it take. A wire record from the Stack to Home, never stored. Home words it for a person.",
  );
export type StackFitPlan = z.infer<typeof StackFitPlan>;
