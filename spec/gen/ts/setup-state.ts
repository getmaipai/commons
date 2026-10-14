// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/setup-state.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The household-scope setup progress record for one hub. Choices reference existing settings; the record does not duplicate them.*/
export const SetupState = z
  .object({
    /**Stable id for this hub setup record.*/
    id: z.string().min(1).describe("Stable id for this hub setup record."),
    /**How setup began; this is the record provenance.*/
    source: z
      .enum(["wizard", "restore"])
      .describe("How setup began; this is the record provenance."),
    /**Progress for the fixed setup flow, in screen order.*/
    steps: z
      .array(
        z
          .object({
            id: z.enum([
              "welcome",
              "engine_location",
              "storage",
              "checks",
              "plan",
              "away",
              "owner",
              "face",
              "profile",
              "hello",
              "done",
            ]),
            status: z.enum([
              "pending",
              "running",
              "done",
              "skipped",
              "deferred",
              "failed",
            ]),
            at: z.string().datetime({ offset: true }),
            error: z
              .object({
                /**Stable and unique per condition, `engine.crashed.chat`, `memory-pressure-warn`.*/
                code: z
                  .string()
                  .regex(new RegExp("^[a-z][a-z0-9.-]*$"))
                  .describe(
                    "Stable and unique per condition, `engine.crashed.chat`, `memory-pressure-warn`.",
                  ),
                severity: z.enum(["critical", "error", "warning"]),
                title: z.string().min(1),
                text: z.string().min(1),
                since: z.string().datetime({ offset: true }),
                cause: z.string().min(1),
                fix: z
                  .object({
                    label: z.string().min(1),
                    action: z.enum([
                      "restart_engine",
                      "free_memory",
                      "retry_download",
                      "rollback_update",
                      "reinstall_engine",
                      "reinstall_model",
                    ]),
                  })
                  .strict()
                  .optional(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .describe("Progress for the fixed setup flow, in screen order."),
    phase: z.enum(["computers", "away", "meet", "done"]),
    engine: z
      .object({
        /**Mirrors engines.stack.where; it does not replace that setting.*/
        where: z
          .enum(["this_computer", "another_computer"])
          .describe(
            "Mirrors engines.stack.where; it does not replace that setting.",
          ),
        link_id: z.string().min(1).optional(),
        /**Hardware facts reported by the selected engine computer.*/
        hardware: z
          .record(z.string(), z.any())
          .describe("Hardware facts reported by the selected engine computer."),
      })
      .strict(),
    away: z.enum(["on", "later"]),
    plan: z
      .object({
        option: z.string().min(1),
        tier: z.string().min(1),
        /**References to per-role Setting records, never copies of their values.*/
        roles: z
          .array(
            z
              .string()
              .regex(new RegExp("^engines\\.[a-z_]+\\.choice$"))
              .describe(
                "The key of a per-role Setting record, not its copied value.",
              ),
          )
          .refine(
            (arr) => arr.every((item, i) => arr.indexOf(item) == i),
            "All items must be unique!",
          )
          .describe(
            "References to per-role Setting records, never copies of their values.",
          ),
      })
      .strict(),
    checks: z.array(
      z
        .object({
          /**Stable and unique per condition, `engine.crashed.chat`, `memory-pressure-warn`.*/
          code: z
            .string()
            .regex(new RegExp("^[a-z][a-z0-9.-]*$"))
            .describe(
              "Stable and unique per condition, `engine.crashed.chat`, `memory-pressure-warn`.",
            ),
          severity: z.enum(["critical", "error", "warning"]),
          title: z.string().min(1),
          text: z.string().min(1),
          since: z.string().datetime({ offset: true }),
          cause: z.string().min(1),
          fix: z
            .object({
              label: z.string().min(1),
              action: z.enum([
                "restart_engine",
                "free_memory",
                "retry_download",
                "rollback_update",
                "reinstall_engine",
                "reinstall_model",
              ]),
            })
            .strict()
            .optional(),
        })
        .strict(),
    ),
    started_at: z.string().datetime({ offset: true }),
    completed_at: z.union([z.string().datetime({ offset: true }), z.null()]),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
  })
  .strict()
  .describe(
    "The household-scope setup progress record for one hub. Choices reference existing settings; the record does not duplicate them.",
  );
export type SetupState = z.infer<typeof SetupState>;
