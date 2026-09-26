// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/project.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A durable unit of background work a turn started: a plan of typed steps, their runtime state, and the artifacts they produced. The turn replies immediately; the project runs after it, survives restarts, and posts its artifacts back to the thread.*/
export const Project = z
  .object({
    id: z.string().min(1),
    /**The catalog package id that defined this project's plan, or adhoc for a model-authored plan.*/
    type: z
      .string()
      .min(1)
      .describe(
        "The catalog package id that defined this project's plan, or adhoc for a model-authored plan.",
      ),
    /**Person-readable, shown in the thread.*/
    title: z.string().min(1).describe("Person-readable, shown in the thread."),
    state: z.enum(["planned", "running", "done", "failed", "cancelled"]),
    plan: z
      .object({
        steps: z
          .array(
            z.any().superRefine((x, ctx) => {
              const schemas = [
                z
                  .object({
                    id: z.string().min(1),
                    kind: z.literal("text"),
                    needs: z.array(z.string()),
                    params: z
                      .object({
                        role: z.literal("chat"),
                        promptTemplate: z.string().min(1),
                        inputs: z.array(z.string()),
                      })
                      .strict(),
                  })
                  .strict(),
                z
                  .object({
                    id: z.string().min(1),
                    kind: z.literal("media"),
                    needs: z.array(z.string()),
                    params: z
                      .object({
                        role: z.enum(["image", "video", "music"]),
                        quality: z.enum(["fast", "everyday", "best"]),
                        promptTemplate: z.string(),
                        inputs: z.array(z.string()),
                      })
                      .strict(),
                  })
                  .strict(),
                z
                  .object({
                    id: z.string().min(1),
                    kind: z.literal("tool"),
                    needs: z.array(z.string()),
                    params: z
                      .object({
                        tool: z.string().min(1),
                        args: z.record(z.string(), z.any()),
                      })
                      .strict(),
                  })
                  .strict(),
                z
                  .object({
                    id: z.string().min(1),
                    kind: z.literal("assemble"),
                    needs: z.array(z.string()),
                    params: z
                      .object({
                        assembler: z.string().min(1),
                        inputs: z.array(z.string()).min(1),
                      })
                      .strict(),
                  })
                  .strict(),
                z
                  .object({
                    id: z.string().min(1),
                    kind: z.literal("gate"),
                    needs: z.array(z.string()),
                    params: z.object({ target: z.string().min(1) }).strict(),
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
            }),
          )
          .min(1)
          .max(25),
        ceilings: z
          .object({
            maxWallSeconds: z.number().int().gte(1),
            maxGeneratorJobs: z.number().int().gte(1),
          })
          .strict(),
      })
      .strict(),
    steps: z.array(
      z
        .object({
          stepId: z.string(),
          state: z.enum(["pending", "running", "done", "failed", "skipped"]),
          startedAt: z.union([z.string().datetime({ offset: true }), z.null()]),
          endedAt: z.union([z.string().datetime({ offset: true }), z.null()]),
          error: z.union([z.string(), z.null()]),
          artifactIds: z.array(z.string()),
        })
        .strict(),
    ),
    artifacts: z.array(
      z
        .object({
          id: z.string(),
          kind: z.enum(["document", "image", "audio", "video", "file"]),
          path: z.string().min(1),
          gate: z.enum(["pending", "passed", "failed"]),
          createdAt: z.string().datetime({ offset: true }),
        })
        .strict(),
    ),
    provenance: z
      .object({
        person: z.string().min(1),
        /**Null when the project was started from an incognito thread.*/
        conversationId: z
          .union([
            z
              .string()
              .describe(
                "Null when the project was started from an incognito thread.",
              ),
            z
              .null()
              .describe(
                "Null when the project was started from an incognito thread.",
              ),
          ])
          .describe(
            "Null when the project was started from an incognito thread.",
          ),
        turnId: z.union([z.string(), z.null()]),
        planSource: z.enum(["package", "model"]),
      })
      .strict(),
    /**Plain words when state is failed.*/
    error: z
      .union([
        z.string().describe("Plain words when state is failed."),
        z.null().describe("Plain words when state is failed."),
      ])
      .describe("Plain words when state is failed."),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .describe(
    "A durable unit of background work a turn started: a plan of typed steps, their runtime state, and the artifacts they produced. The turn replies immediately; the project runs after it, survives restarts, and posts its artifacts back to the thread.",
  );
export type Project = z.infer<typeof Project>;
