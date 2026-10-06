// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/device-command.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A typed hub-to-robot command event. The id is stable across replay; payload shape is selected by kind.*/
export const DeviceCommand = z
  .any()
  .superRefine((x, ctx) => {
    const schemas = [
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("mute"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.record(z.string(), z.never()),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("unmute"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.record(z.string(), z.never()),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("capture_request"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({ turn_id: z.string().min(1), kind: z.literal("still") })
            .strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("alarm"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              alarm_id: z.string().min(1),
              area: z.union([z.string(), z.null()]),
              kind: z.enum([
                "smoke",
                "carbon_monoxide",
                "gas",
                "water_leak",
                "alarm_panel",
              ]),
              state: z.enum(["active", "cleared", "false_alarm"]),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("notify"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              notification_id: z.string().min(1),
              text: z.string().min(1).max(1000),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("notify_gesture"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              gesture: z.enum(["doorbell", "timer", "arrival", "perk"]),
              bearing: z
                .union([
                  z.number().gte(-3.141592653589793).lte(3.141592653589793),
                  z.null(),
                ])
                .optional(),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("offer"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              offer: z
                .object({
                  id: z.string().min(1).max(128),
                  person_id: z
                    .string()
                    .regex(new RegExp("^person-[a-z0-9]{6,}$")),
                  tier: z.number().int().gte(1).lte(3),
                  text: z.string().min(1).max(500),
                  expires_at: z.string().datetime({ offset: true }),
                  provenance: z.string().min(1).max(300),
                  hlc: z
                    .string()
                    .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
                })
                .strict(),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("play_move"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.object({ move_id: z.string().min(1) }).strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("settings_changed"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.object({ values: z.record(z.string(), z.any()) }).strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("time"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({ hub_time: z.string().datetime({ offset: true }) })
            .strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("live_view_start"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              view_id: z.string().min(1),
              fps: z.literal(5),
              size: z.literal("640x360"),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("live_view_stop"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.object({ view_id: z.string().min(1) }).strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("asset_changed"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.object({ manifest_version: z.string().min(1) }).strict(),
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
    "A typed hub-to-robot command event. The id is stable across replay; payload shape is selected by kind.",
  );
export type DeviceCommand = z.infer<typeof DeviceCommand>;
