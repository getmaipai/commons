// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/robot-channel-frame.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A typed robot-to-hub frame carried by the robot notification channel.*/
export const RobotChannelFrame = z
  .any()
  .superRefine((x, ctx) => {
    const schemas = [
      z
        .object({
          kind: z.literal("ack"),
          payload: z
            .object({
              command_id: z.string().min(1).max(128),
              delivered_at: z.string().datetime({ offset: true }),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          kind: z.literal("offer_answer"),
          payload: z
            .object({
              offer_id: z.string().min(1).max(128),
              approved: z.boolean(),
              source: z.literal("voice"),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          kind: z.literal("offer_snooze"),
          payload: z
            .object({
              offer_id: z.string().min(1).max(128),
              source: z.literal("voice"),
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
                "Invalid input: Should pass single schema. Passed " + passed,
            }
          : {
              path: [],
              code: "custom",
              errors: [errors],
              message:
                "Invalid input: Should pass single schema. Passed " + passed,
            },
      );
    }
  })
  .describe(
    "A typed robot-to-hub frame carried by the robot notification channel.",
  );
export type RobotChannelFrame = z.infer<typeof RobotChannelFrame>;
