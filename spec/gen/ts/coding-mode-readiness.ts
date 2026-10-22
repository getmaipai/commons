// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/coding-mode-readiness.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Home's readiness check for the shared computer's coding mode. Each item has a stable reason key in vocab/coding-mode-readiness-reasons.json and a heading anchor in the future coding-mode.md user page.*/
export const CodingModeReadiness = z
  .object({
    /**True only when every item is done; this derived rule is checked alongside the schema.*/
    ready: z
      .boolean()
      .describe(
        "True only when every item is done; this derived rule is checked alongside the schema.",
      ),
    first_unmet: z.union([
      z.literal("coding_enabled"),
      z.literal("engine"),
      z.literal("pieces"),
      z.literal("hardware"),
      z.literal("memory"),
      z.literal("self_test"),
      z.literal("client"),
      z.literal("bench"),
      z.literal(null),
    ]),
    checked_at: z.string().datetime({ offset: true }),
    items: z
      .array(
        z
          .object({
            id: z.enum([
              "coding_enabled",
              "engine",
              "pieces",
              "hardware",
              "memory",
              "self_test",
              "client",
              "bench",
            ]),
            state: z.enum(["done", "can_do", "manual"]),
            reason_key: z.enum([
              "coding_enabled",
              "engine",
              "pieces",
              "hardware",
              "memory",
              "self_test",
              "client",
              "bench",
            ]),
            doc_anchor: z.string().min(1),
          })
          .strict(),
      )
      .min(8)
      .max(8),
    provenance: z.string().min(1),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe(
    "Home's readiness check for the shared computer's coding mode. Each item has a stable reason key in vocab/coding-mode-readiness-reasons.json and a heading anchor in the future coding-mode.md user page.",
  );
export type CodingModeReadiness = z.infer<typeof CodingModeReadiness>;
