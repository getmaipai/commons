// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/result.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**What a package's handle() (or a recipe's interpreted run) returns. See platform plan 4.9.*/
export const PluginResult = z
  .object({
    reply: z
      .object({ text: z.string(), speech: z.string().optional() })
      .strict()
      .optional(),
    data: z.any().optional(),
    synthesis_hint: z.string().optional(),
    actions: z.array(z.record(z.string(), z.any())).default([]),
    directive: z.record(z.string(), z.any()).optional(),
    confirm: z
      .object({
        prompt: z.string().optional(),
        on_confirm: z.record(z.string(), z.any()).optional(),
      })
      .strict()
      .optional(),
    /**Lets a deterministic follow-up match without a model (4.5).*/
    ask: z
      .object({ prompt: z.string().optional(), expects: z.string().optional() })
      .strict()
      .describe("Lets a deterministic follow-up match without a model (4.5).")
      .optional(),
    end_conversation: z.boolean().optional(),
    article: z.record(z.string(), z.any()).optional(),
    /**GENUI-01: typed answer blocks this call returns, in display order. Optional and additive. The hub validates each one, applies the output floor, drops an invalid one, and streams the rest as `block` events. A package may only return kinds its manifest lists in `returns_blocks`.*/
    blocks: z
      .array(
        z
          .any()
          .superRefine((x, ctx) => {
            const schemas = [
              z
                .object({
                  /**Stable identity of this block. Unique within a turn's block list.*/
                  id: z
                    .string()
                    .regex(new RegExp("^blk-[a-z0-9]{6,}$"))
                    .describe(
                      "Stable identity of this block. Unique within a turn's block list.",
                    ),
                  kind: z.literal("spec_sheet"),
                  schema_version: z.literal(1),
                  /**The id of the package that returned the block.*/
                  producer: z
                    .string()
                    .min(1)
                    .describe("The id of the package that returned the block."),
                  /**One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.*/
                  alt: z
                    .string()
                    .min(1)
                    .max(300)
                    .describe(
                      "One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.",
                    ),
                  /**Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.*/
                  min_band: z
                    .enum(["child", "teen", "adult"])
                    .describe(
                      "Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.",
                    )
                    .optional(),
                  /**Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).*/
                  provenance: z
                    .string()
                    .min(1)
                    .describe(
                      "Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).",
                    ),
                  created_at: z.string().datetime({ offset: true }),
                  /**Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.*/
                  hlc: z
                    .string()
                    .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
                    .describe(
                      "Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.",
                    ),
                  /**GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.*/
                  after_paragraph: z
                    .number()
                    .int()
                    .gte(0)
                    .describe(
                      "GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.",
                    )
                    .optional(),
                  props: z
                    .object({
                      title: z.string(),
                      subtitle: z.string().optional(),
                      rows: z.array(
                        z
                          .object({
                            label: z.string(),
                            value: z.string(),
                            emphasis: z.boolean().optional(),
                          })
                          .strict(),
                      ),
                    })
                    .strict(),
                })
                .strict(),
              z
                .object({
                  /**Stable identity of this block. Unique within a turn's block list.*/
                  id: z
                    .string()
                    .regex(new RegExp("^blk-[a-z0-9]{6,}$"))
                    .describe(
                      "Stable identity of this block. Unique within a turn's block list.",
                    ),
                  kind: z.literal("data_table"),
                  schema_version: z.literal(1),
                  /**The id of the package that returned the block.*/
                  producer: z
                    .string()
                    .min(1)
                    .describe("The id of the package that returned the block."),
                  /**One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.*/
                  alt: z
                    .string()
                    .min(1)
                    .max(300)
                    .describe(
                      "One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.",
                    ),
                  /**Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.*/
                  min_band: z
                    .enum(["child", "teen", "adult"])
                    .describe(
                      "Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.",
                    )
                    .optional(),
                  /**Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).*/
                  provenance: z
                    .string()
                    .min(1)
                    .describe(
                      "Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).",
                    ),
                  created_at: z.string().datetime({ offset: true }),
                  /**Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.*/
                  hlc: z
                    .string()
                    .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
                    .describe(
                      "Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.",
                    ),
                  /**GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.*/
                  after_paragraph: z
                    .number()
                    .int()
                    .gte(0)
                    .describe(
                      "GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.",
                    )
                    .optional(),
                  props: z
                    .object({
                      columns: z.array(
                        z
                          .object({
                            /**The key of this column's value in each row.*/
                            id: z
                              .string()
                              .min(1)
                              .describe(
                                "The key of this column's value in each row.",
                              ),
                            header: z.string(),
                            align: z.enum(["start", "end"]).optional(),
                            minWidth: z.number().gte(0).optional(),
                            sortable: z.boolean().optional(),
                            format: z
                              .any()
                              .superRefine((x, ctx) => {
                                const schemas = [
                                  z
                                    .object({ kind: z.literal("text") })
                                    .strict(),
                                  z
                                    .object({
                                      kind: z.literal("number"),
                                      decimals: z
                                        .number()
                                        .int()
                                        .gte(0)
                                        .lte(20)
                                        .optional(),
                                      compact: z.boolean().optional(),
                                      unit: z.string().optional(),
                                    })
                                    .strict(),
                                  z
                                    .object({
                                      kind: z.literal("currency"),
                                      currency: z
                                        .string()
                                        .regex(new RegExp("^[A-Z]{3}$")),
                                      decimals: z
                                        .number()
                                        .int()
                                        .gte(0)
                                        .lte(20)
                                        .optional(),
                                      compact: z.boolean().optional(),
                                    })
                                    .strict(),
                                  z
                                    .object({
                                      kind: z.literal("percent"),
                                      decimals: z
                                        .number()
                                        .int()
                                        .gte(0)
                                        .lte(20)
                                        .optional(),
                                      basis: z
                                        .enum(["fraction", "unit"])
                                        .optional(),
                                    })
                                    .strict(),
                                  z
                                    .object({
                                      kind: z.literal("delta"),
                                      decimals: z
                                        .number()
                                        .int()
                                        .gte(0)
                                        .lte(20)
                                        .optional(),
                                      unit: z.string().optional(),
                                      upIsGood: z.boolean().optional(),
                                    })
                                    .strict(),
                                  z
                                    .object({
                                      kind: z.literal("date"),
                                      style: z
                                        .enum(["date", "datetime", "relative"])
                                        .optional(),
                                    })
                                    .strict(),
                                  z
                                    .object({
                                      kind: z.literal("boolean"),
                                      trueLabel: z.string().optional(),
                                      falseLabel: z.string().optional(),
                                    })
                                    .strict(),
                                  z
                                    .object({
                                      kind: z.literal("link"),
                                      hrefKey: z.string().optional(),
                                    })
                                    .strict(),
                                  z
                                    .object({
                                      kind: z.literal("badge"),
                                      tones: z
                                        .record(
                                          z.string(),
                                          z.enum([
                                            "neutral",
                                            "success",
                                            "warning",
                                            "danger",
                                          ]),
                                        )
                                        .optional(),
                                    })
                                    .strict(),
                                  z
                                    .object({
                                      kind: z.literal("list"),
                                      max: z.number().int().gte(1).optional(),
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
                                            errors: [
                                              ...errors,
                                              ...result.error.issues,
                                            ],
                                            failed: failed + 1,
                                          }
                                        : { errors, failed })(
                                      schema.safeParse(x),
                                    ),
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
                              .optional(),
                          })
                          .strict(),
                      ),
                      rows: z.array(
                        z.record(
                          z.string(),
                          z
                            .union([
                              z
                                .string()
                                .describe(
                                  "One table cell: plain data, never markup.",
                                ),
                              z
                                .number()
                                .describe(
                                  "One table cell: plain data, never markup.",
                                ),
                              z
                                .boolean()
                                .describe(
                                  "One table cell: plain data, never markup.",
                                ),
                              z
                                .null()
                                .describe(
                                  "One table cell: plain data, never markup.",
                                ),
                            ])
                            .describe(
                              "One table cell: plain data, never markup.",
                            ),
                        ),
                      ),
                      caption: z.string().optional(),
                      sort: z
                        .union([
                          z
                            .object({
                              columnId: z.string().min(1),
                              direction: z.enum(["asc", "desc"]),
                            })
                            .strict(),
                          z.null(),
                        ])
                        .optional(),
                      /**Per-column formats by column id, for a column that carries no `format` of its own.*/
                      formats: z
                        .record(
                          z.string(),
                          z.any().superRefine((x, ctx) => {
                            const schemas = [
                              z.object({ kind: z.literal("text") }).strict(),
                              z
                                .object({
                                  kind: z.literal("number"),
                                  decimals: z
                                    .number()
                                    .int()
                                    .gte(0)
                                    .lte(20)
                                    .optional(),
                                  compact: z.boolean().optional(),
                                  unit: z.string().optional(),
                                })
                                .strict(),
                              z
                                .object({
                                  kind: z.literal("currency"),
                                  currency: z
                                    .string()
                                    .regex(new RegExp("^[A-Z]{3}$")),
                                  decimals: z
                                    .number()
                                    .int()
                                    .gte(0)
                                    .lte(20)
                                    .optional(),
                                  compact: z.boolean().optional(),
                                })
                                .strict(),
                              z
                                .object({
                                  kind: z.literal("percent"),
                                  decimals: z
                                    .number()
                                    .int()
                                    .gte(0)
                                    .lte(20)
                                    .optional(),
                                  basis: z
                                    .enum(["fraction", "unit"])
                                    .optional(),
                                })
                                .strict(),
                              z
                                .object({
                                  kind: z.literal("delta"),
                                  decimals: z
                                    .number()
                                    .int()
                                    .gte(0)
                                    .lte(20)
                                    .optional(),
                                  unit: z.string().optional(),
                                  upIsGood: z.boolean().optional(),
                                })
                                .strict(),
                              z
                                .object({
                                  kind: z.literal("date"),
                                  style: z
                                    .enum(["date", "datetime", "relative"])
                                    .optional(),
                                })
                                .strict(),
                              z
                                .object({
                                  kind: z.literal("boolean"),
                                  trueLabel: z.string().optional(),
                                  falseLabel: z.string().optional(),
                                })
                                .strict(),
                              z
                                .object({
                                  kind: z.literal("link"),
                                  hrefKey: z.string().optional(),
                                })
                                .strict(),
                              z
                                .object({
                                  kind: z.literal("badge"),
                                  tones: z
                                    .record(
                                      z.string(),
                                      z.enum([
                                        "neutral",
                                        "success",
                                        "warning",
                                        "danger",
                                      ]),
                                    )
                                    .optional(),
                                })
                                .strict(),
                              z
                                .object({
                                  kind: z.literal("list"),
                                  max: z.number().int().gte(1).optional(),
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
                                        errors: [
                                          ...errors,
                                          ...result.error.issues,
                                        ],
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
                          }),
                        )
                        .describe(
                          "Per-column formats by column id, for a column that carries no `format` of its own.",
                        )
                        .optional(),
                      emptyLabel: z.string().optional(),
                      locale: z.string().min(1).optional(),
                      /**Epoch milliseconds that relative dates are measured from, so every client renders the same words.*/
                      relativeTo: z
                        .number()
                        .describe(
                          "Epoch milliseconds that relative dates are measured from, so every client renders the same words.",
                        )
                        .optional(),
                    })
                    .strict(),
                })
                .strict(),
              z
                .object({
                  /**Stable identity of this block. Unique within a turn's block list.*/
                  id: z
                    .string()
                    .regex(new RegExp("^blk-[a-z0-9]{6,}$"))
                    .describe(
                      "Stable identity of this block. Unique within a turn's block list.",
                    ),
                  kind: z.literal("chart"),
                  schema_version: z.literal(1),
                  /**The id of the package that returned the block.*/
                  producer: z
                    .string()
                    .min(1)
                    .describe("The id of the package that returned the block."),
                  /**One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.*/
                  alt: z
                    .string()
                    .min(1)
                    .max(300)
                    .describe(
                      "One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.",
                    ),
                  /**Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.*/
                  min_band: z
                    .enum(["child", "teen", "adult"])
                    .describe(
                      "Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.",
                    )
                    .optional(),
                  /**Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).*/
                  provenance: z
                    .string()
                    .min(1)
                    .describe(
                      "Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).",
                    ),
                  created_at: z.string().datetime({ offset: true }),
                  /**Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.*/
                  hlc: z
                    .string()
                    .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
                    .describe(
                      "Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.",
                    ),
                  /**GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.*/
                  after_paragraph: z
                    .number()
                    .int()
                    .gte(0)
                    .describe(
                      "GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.",
                    )
                    .optional(),
                  props: z
                    .object({
                      label: z.string(),
                      value: z.string(),
                      delta: z.string().optional(),
                      points: z.array(z.number()).min(1).max(500),
                      variant: z.enum(["area", "line", "bars"]).optional(),
                      trend: z.enum(["up", "down", "flat"]).optional(),
                      upIsGood: z.boolean().optional(),
                    })
                    .strict(),
                })
                .strict(),
              z
                .object({
                  /**Stable identity of this block. Unique within a turn's block list.*/
                  id: z
                    .string()
                    .regex(new RegExp("^blk-[a-z0-9]{6,}$"))
                    .describe(
                      "Stable identity of this block. Unique within a turn's block list.",
                    ),
                  kind: z.literal("timeline"),
                  schema_version: z.literal(1),
                  /**The id of the package that returned the block.*/
                  producer: z
                    .string()
                    .min(1)
                    .describe("The id of the package that returned the block."),
                  /**One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.*/
                  alt: z
                    .string()
                    .min(1)
                    .max(300)
                    .describe(
                      "One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.",
                    ),
                  /**Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.*/
                  min_band: z
                    .enum(["child", "teen", "adult"])
                    .describe(
                      "Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.",
                    )
                    .optional(),
                  /**Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).*/
                  provenance: z
                    .string()
                    .min(1)
                    .describe(
                      "Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).",
                    ),
                  created_at: z.string().datetime({ offset: true }),
                  /**Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.*/
                  hlc: z
                    .string()
                    .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
                    .describe(
                      "Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.",
                    ),
                  /**GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.*/
                  after_paragraph: z
                    .number()
                    .int()
                    .gte(0)
                    .describe(
                      "GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.",
                    )
                    .optional(),
                  props: z
                    .object({
                      events: z.array(
                        z
                          .object({
                            id: z.string().min(1),
                            when: z.enum(["past", "now", "future"]),
                            time: z.string(),
                            title: z.string(),
                            detail: z.string().optional(),
                          })
                          .strict(),
                      ),
                    })
                    .strict(),
                })
                .strict(),
              z
                .object({
                  /**Stable identity of this block. Unique within a turn's block list.*/
                  id: z
                    .string()
                    .regex(new RegExp("^blk-[a-z0-9]{6,}$"))
                    .describe(
                      "Stable identity of this block. Unique within a turn's block list.",
                    ),
                  kind: z.literal("todo_list"),
                  schema_version: z.literal(1),
                  /**The id of the package that returned the block.*/
                  producer: z
                    .string()
                    .min(1)
                    .describe("The id of the package that returned the block."),
                  /**One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.*/
                  alt: z
                    .string()
                    .min(1)
                    .max(300)
                    .describe(
                      "One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.",
                    ),
                  /**Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.*/
                  min_band: z
                    .enum(["child", "teen", "adult"])
                    .describe(
                      "Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.",
                    )
                    .optional(),
                  /**Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).*/
                  provenance: z
                    .string()
                    .min(1)
                    .describe(
                      "Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).",
                    ),
                  created_at: z.string().datetime({ offset: true }),
                  /**Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.*/
                  hlc: z
                    .string()
                    .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
                    .describe(
                      "Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.",
                    ),
                  /**GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.*/
                  after_paragraph: z
                    .number()
                    .int()
                    .gte(0)
                    .describe(
                      "GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.",
                    )
                    .optional(),
                  props: z
                    .object({
                      items: z.array(
                        z
                          .object({
                            id: z.string().min(1),
                            text: z.string(),
                            status: z.enum([
                              "pending",
                              "active",
                              "done",
                              "failed",
                            ]),
                            reason: z.string().optional(),
                            description: z.string().optional(),
                          })
                          .strict(),
                      ),
                      title: z.string().optional(),
                      description: z.string().optional(),
                      maxVisible: z.number().int().gte(1).optional(),
                    })
                    .strict(),
                })
                .strict(),
              z
                .object({
                  /**Stable identity of this block. Unique within a turn's block list.*/
                  id: z
                    .string()
                    .regex(new RegExp("^blk-[a-z0-9]{6,}$"))
                    .describe(
                      "Stable identity of this block. Unique within a turn's block list.",
                    ),
                  kind: z.literal("image_gallery"),
                  schema_version: z.literal(1),
                  /**The id of the package that returned the block.*/
                  producer: z
                    .string()
                    .min(1)
                    .describe("The id of the package that returned the block."),
                  /**One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.*/
                  alt: z
                    .string()
                    .min(1)
                    .max(300)
                    .describe(
                      "One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.",
                    ),
                  /**Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.*/
                  min_band: z
                    .enum(["child", "teen", "adult"])
                    .describe(
                      "Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.",
                    )
                    .optional(),
                  /**Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).*/
                  provenance: z
                    .string()
                    .min(1)
                    .describe(
                      "Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).",
                    ),
                  created_at: z.string().datetime({ offset: true }),
                  /**Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.*/
                  hlc: z
                    .string()
                    .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
                    .describe(
                      "Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.",
                    ),
                  /**GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.*/
                  after_paragraph: z
                    .number()
                    .int()
                    .gte(0)
                    .describe(
                      "GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.",
                    )
                    .optional(),
                  props: z
                    .object({
                      images: z.array(
                        z
                          .object({
                            id: z.string().min(1),
                            /**A picture reference. The hub rewrites it to a hub-proxied id before the block is streamed or stored; a package never sends a client a third-party image address.*/
                            src: z
                              .string()
                              .min(1)
                              .describe(
                                "A picture reference. The hub rewrites it to a hub-proxied id before the block is streamed or stored; a package never sends a client a third-party image address.",
                              ),
                            /**This picture's own text fallback.*/
                            alt: z
                              .string()
                              .min(1)
                              .describe("This picture's own text fallback."),
                            caption: z.string().optional(),
                            source: z
                              .object({
                                label: z.string().optional(),
                                url: z.string().url().optional(),
                              })
                              .strict()
                              .optional(),
                          })
                          .strict(),
                      ),
                      maxVisible: z.number().int().gte(1).optional(),
                    })
                    .strict(),
                })
                .strict(),
              z
                .object({
                  /**Stable identity of this block. Unique within a turn's block list.*/
                  id: z
                    .string()
                    .regex(new RegExp("^blk-[a-z0-9]{6,}$"))
                    .describe(
                      "Stable identity of this block. Unique within a turn's block list.",
                    ),
                  kind: z.literal("schedule_card"),
                  schema_version: z.literal(1),
                  /**The id of the package that returned the block.*/
                  producer: z
                    .string()
                    .min(1)
                    .describe("The id of the package that returned the block."),
                  /**One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.*/
                  alt: z
                    .string()
                    .min(1)
                    .max(300)
                    .describe(
                      "One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.",
                    ),
                  /**Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.*/
                  min_band: z
                    .enum(["child", "teen", "adult"])
                    .describe(
                      "Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.",
                    )
                    .optional(),
                  /**Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).*/
                  provenance: z
                    .string()
                    .min(1)
                    .describe(
                      "Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).",
                    ),
                  created_at: z.string().datetime({ offset: true }),
                  /**Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.*/
                  hlc: z
                    .string()
                    .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
                    .describe(
                      "Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.",
                    ),
                  /**GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.*/
                  after_paragraph: z
                    .number()
                    .int()
                    .gte(0)
                    .describe(
                      "GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.",
                    )
                    .optional(),
                  props: z
                    .object({
                      name: z.string(),
                      cadence: z.string(),
                      nextRun: z.string(),
                      enabled: z.boolean(),
                      history: z.array(
                        z
                          .object({
                            id: z.string().min(1),
                            at: z.string(),
                            ok: z.boolean(),
                          })
                          .strict(),
                      ),
                    })
                    .strict(),
                })
                .strict(),
              z
                .object({
                  /**Stable identity of this block. Unique within a turn's block list.*/
                  id: z
                    .string()
                    .regex(new RegExp("^blk-[a-z0-9]{6,}$"))
                    .describe(
                      "Stable identity of this block. Unique within a turn's block list.",
                    ),
                  kind: z.literal("comparison"),
                  schema_version: z.literal(1),
                  /**The id of the package that returned the block.*/
                  producer: z
                    .string()
                    .min(1)
                    .describe("The id of the package that returned the block."),
                  /**One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.*/
                  alt: z
                    .string()
                    .min(1)
                    .max(300)
                    .describe(
                      "One plain sentence that says what the block shows, for a screen reader, a client with no renderer for this kind, or the robot's voice.",
                    ),
                  /**Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.*/
                  min_band: z
                    .enum(["child", "teen", "adult"])
                    .describe(
                      "Optional. The youngest age band that may be shown this block; absent means every band. The output floor still applies to each string.",
                    )
                    .optional(),
                  /**Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).*/
                  provenance: z
                    .string()
                    .min(1)
                    .describe(
                      "Free-text provenance for the block, such as the producing call or the data it was built from (the same shape TurnArtifact uses).",
                    ),
                  created_at: z.string().datetime({ offset: true }),
                  /**Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.*/
                  hlc: z
                    .string()
                    .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
                    .describe(
                      "Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.",
                    ),
                  /**GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.*/
                  after_paragraph: z
                    .number()
                    .int()
                    .gte(0)
                    .describe(
                      "GENUI-13a: where the block sits in the released reply text, the same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released text come before it. 0 is before any text; absent means after the whole reply, so a record written before this field renders as it always did. Stamped by the hub only (a package returns blocks before any prose exists and never sets it; the host drops a value a package sends). Paragraphs are counted and split by `paragraphCount` and `splitAfterParagraph` in `spec/interpreters` (TS and Python), so the hub and every client count alike. Placement is by readiness and paragraph boundary, never by matching the block's words to the prose.",
                    )
                    .optional(),
                  props: z
                    .object({
                      traitLabels: z.array(z.string()),
                      options: z.array(
                        z
                          .object({
                            id: z.string().min(1),
                            name: z.string(),
                            headline: z.string(),
                            /**One entry per trait label, in order: the option's value for that trait, or false when it lacks the trait.*/
                            traits: z
                              .array(z.union([z.string(), z.literal(false)]))
                              .describe(
                                "One entry per trait label, in order: the option's value for that trait, or false when it lacks the trait.",
                              ),
                          })
                          .strict(),
                      ),
                      /**The id of the option marked as the pick. Absent: no option is marked.*/
                      recommendedId: z
                        .string()
                        .min(1)
                        .describe(
                          "The id of the option marked as the pick. Absent: no option is marked.",
                        )
                        .optional(),
                      reason: z.string().optional(),
                    })
                    .strict(),
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
            "GENUI-01: one typed, renderable part of an answer, defined once here. A package returns blocks on `PluginResult.blocks`; the hub validates them, applies the output floor to each string by band, streams each as a `block` turn-stream event and stores them on the turn's `blocks`. Every client renders the same record: the web kit dispatches `kind` to the Element of the same name, Go renders it natively, the robot says `alt` when it has no screen. A client that does not know a `kind` falls back to `alt`. Envelope: `id`, `kind`, `schema_version`, `producer` (package id), `alt` (one plain sentence a screen reader, a TV fallback or the robot can say), optional `min_band`, `provenance`, `created_at`, `hlc` (the clock stamp every synced record carries) and `after_paragraph` (hub-stamped placement in the reply text), and the kind's `props`. Each kind's `props` mirror the props of the kit Element of the same name, so the web render is a pass-through; render-only Element props (visible counts, animation flags, callbacks, nodes) are not part of the record. Prop names are the Element's own (camelCase). Flat, never recursive: no block holds another block. The v1 kinds are a closed, additive list; a later kind is a new enum value and a new `props` shape, never a change to an existing one.",
          ),
      )
      .describe(
        "GENUI-01: typed answer blocks this call returns, in display order. Optional and additive. The hub validates each one, applies the output floor, drops an invalid one, and streams the rest as `block` events. A package may only return kinds its manifest lists in `returns_blocks`.",
      )
      .default([]),
    /**Fix B (docs/dev.md's 'Chat reliability: the 2026-09-07 incident' note): a handler's own typed report that it could not answer (an upstream fetch failure, say) - never present alongside `reply`. Distinct from a thrown exception (which the Tier 1 host maps to a strike and the manifest's fallback_reply already): this is a report of an EXPECTED failure mode a handler catches itself, so the caller can answer with the household-facing fallback without treating the package's own sandbox as unhealthy.*/
    error: z
      .object({
        /**One of spec/errors/errors.json's own codes.*/
        code: z
          .string()
          .describe("One of spec/errors/errors.json's own codes."),
        /**Developer-facing detail, never shown to the household - the household sees the manifest's own fallback_reply or the error catalogue's spoken_fallback instead.*/
        message: z
          .string()
          .describe(
            "Developer-facing detail, never shown to the household - the household sees the manifest's own fallback_reply or the error catalogue's spoken_fallback instead.",
          ),
      })
      .strict()
      .describe(
        "Fix B (docs/dev.md's 'Chat reliability: the 2026-09-07 incident' note): a handler's own typed report that it could not answer (an upstream fetch failure, say) - never present alongside `reply`. Distinct from a thrown exception (which the Tier 1 host maps to a strike and the manifest's fallback_reply already): this is a report of an EXPECTED failure mode a handler catches itself, so the caller can answer with the household-facing fallback without treating the package's own sandbox as unhealthy.",
      )
      .optional(),
  })
  .strict()
  .describe(
    "What a package's handle() (or a recipe's interpreted run) returns. See platform plan 4.9.",
  );
export type PluginResult = z.infer<typeof PluginResult>;
