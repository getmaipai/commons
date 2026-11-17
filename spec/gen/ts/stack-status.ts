// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/stack-status.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Status response for GET /stack/v1/status.*/
export const StackStatus = z
  .object({
    /**Stack health.*/
    health: z
      .enum(["ok", "degraded", "down", "updating"])
      .describe("Stack health."),
    busy: z
      .object({
        /**Running work count.*/
        running: z.number().int().gte(0).describe("Running work count."),
        /**Waiting work count.*/
        waiting: z.number().int().gte(0).describe("Waiting work count."),
      })
      .strict(),
    /**Parts currently in use.*/
    using: z
      .array(
        z
          .object({
            /**Opaque part key.*/
            part_id: z
              .string()
              .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
              .min(1)
              .describe("Opaque part key."),
            /**Memory bytes in use.*/
            bytes: z.number().int().gte(0).describe("Memory bytes in use."),
            /**Associated job id, if any.*/
            job_id: z
              .union([
                z.string().describe("Associated job id, if any."),
                z.null().describe("Associated job id, if any."),
              ])
              .describe("Associated job id, if any."),
          })
          .strict(),
      )
      .describe("Parts currently in use."),
    memory: z
      .object({
        /**Total memory bytes.*/
        total_bytes: z.number().int().gte(0).describe("Total memory bytes."),
        /**Free memory bytes.*/
        free_bytes: z.number().int().gte(0).describe("Free memory bytes."),
        /**Memory budget bytes.*/
        budget_bytes: z.number().int().gte(0).describe("Memory budget bytes."),
        /**Memory pressure.*/
        pressure: z
          .enum(["normal", "warn", "critical"])
          .describe("Memory pressure."),
      })
      .strict(),
    /**Current and recent jobs.*/
    jobs: z
      .array(
        z
          .object({
            /**Job id.*/
            id: z.string().describe("Job id."),
            /**Job kind.*/
            kind: z.string().describe("Job kind."),
            /**Related part id, if any.*/
            part_id: z
              .union([
                z.string().describe("Related part id, if any."),
                z.null().describe("Related part id, if any."),
              ])
              .describe("Related part id, if any."),
            /**Job state.*/
            state: z
              .enum(["running", "waiting", "failed", "done"])
              .describe("Job state."),
            /**Reason, if any.*/
            reason: z
              .union([
                z.string().describe("Reason, if any."),
                z.null().describe("Reason, if any."),
              ])
              .describe("Reason, if any."),
            /**Progress percent, if known.*/
            percent: z
              .union([z.number().gte(0).lte(100), z.null()])
              .describe("Progress percent, if known."),
          })
          .strict(),
      )
      .describe("Current and recent jobs."),
    /**Current problems and their remedies.*/
    problems: z
      .array(
        z
          .object({
            /**Problem code.*/
            code: z.string().min(1).describe("Problem code."),
            /**Related part id, if any.*/
            part_id: z
              .union([
                z.string().describe("Related part id, if any."),
                z.null().describe("Related part id, if any."),
              ])
              .describe("Related part id, if any."),
            /**Plain language problem.*/
            plain: z.string().min(1).describe("Plain language problem."),
            /**Suggested fix.*/
            fix: z.string().min(1).describe("Suggested fix."),
            /**When the problem began. None*/
            since: z.string().describe("When the problem began. None"),
          })
          .strict(),
      )
      .describe("Current problems and their remedies."),
  })
  .strict()
  .describe("Status response for GET /stack/v1/status.");
export type StackStatus = z.infer<typeof StackStatus>;
