// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/device-command.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A typed hub-to-device command event. The id is stable across replay; payload shape is selected by kind.*/
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
          kind: z.literal("find_me"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({ seconds: z.number().int().gte(1).lte(30).default(5) })
            .strict(),
        })
        .strict()
        .describe(
          "The robot chirps and flashes its ring so a person can find it; it never speaks or moves. Queued like every command when the robot is offline.",
        ),
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
          payload: z.any().superRefine((x, ctx) => {
            const schemas = [
              z
                .object({
                  notification_id: z.string().min(1),
                  person_id: z.string().min(1),
                  text: z.string().min(1).max(1000),
                })
                .strict(),
              z
                .object({
                  notification_id: z.string().min(1),
                  person_id: z.string().min(1),
                  form: z.literal("waiting"),
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
              offer_id: z.string().min(1).max(128),
              person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
              tier: z.number().int().gte(1).lte(3),
              non_personal_line: z.string().min(1).max(300),
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
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("motor_reboot"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              /**Names of the motors to reboot, each one the robot listed in motors_reboot_offer. The hub sends this only after an adult chose to reboot on the Devices card; the robot reboots exactly these motors and no others.*/
              motors: z
                .array(z.string().min(1))
                .min(1)
                .refine(
                  (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                  "All items must be unique!",
                )
                .describe(
                  "Names of the motors to reboot, each one the robot listed in motors_reboot_offer. The hub sends this only after an adult chose to reboot on the Devices card; the robot reboots exactly these motors and no others.",
                ),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("play_media"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              media_id: z.string().regex(new RegExp("^media-")),
              position_s: z.number().gte(0),
            })
            .strict(),
        })
        .strict()
        .describe(
          "Play timed media at the requested position. expires_at is issued_at plus 60 seconds. Other command kinds keep their 24 hour expiry.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("self_test"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              run_id: z.string().min(1).max(64),
              part: z.enum(["speaker", "face", "head", "lights", "mic"]),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("dance"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.record(z.string(), z.never()),
        })
        .strict()
        .describe(
          "The robot does its little dance. The robot answers with whether it started; it refuses when the dance is off, it is muted, asleep or low on battery.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("music_test"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.object({ fast: z.boolean().optional() }).strict(),
        })
        .strict()
        .describe(
          "The robot runs its music-dance check: a short nod, then it listens for music and dances if it hears a beat. `fast` shortens the run to about 40 seconds for testing.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("listen_song"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              request_id: z.string().min(1).max(64),
              seconds: z.number().int().gte(5).lte(15).default(10),
            })
            .strict(),
        })
        .strict()
        .describe(
          "The robot records a few seconds of the room's sound with its microphone and posts the clip to Home to name the song, quoting request_id. The robot refuses when it is muted, at night or already capturing; it never keeps the clip.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("song_title"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.object({ text: z.string().max(80) }).strict(),
        })
        .strict()
        .describe(
          "Home tells the robot what to show as the song title at the bottom of its screen (after the person confirms or corrects a song name); an empty text clears it. The robot refuses while it is muted or in full quiet.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("wifi_add"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              ssid: z.string().min(1).max(32),
              password: z.string().max(63),
            })
            .strict(),
        })
        .strict()
        .describe(
          "Home tells the robot to save a Wi-Fi network. The password is write-only: the hub never persists or logs it.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("wifi_forget"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.object({ ssid: z.string().min(1).max(32) }).strict(),
        })
        .strict()
        .describe("Home tells the robot to forget a saved Wi-Fi network."),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("wifi_use"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.object({ ssid: z.string().min(1).max(32) }).strict(),
        })
        .strict()
        .describe(
          "Home tells the robot to leave its current Wi-Fi and join one saved network now (an away test without moving the robot). The robot holds the choice in memory only, never rewrites its saved list, and goes back to its saved networks by itself if it does not reach the hub within 3 minutes.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("prefer_tailnet"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({ minutes: z.number().int().gte(0).lte(120) })
            .strict(),
        })
        .strict()
        .describe(
          "Home tells the robot to prefer its tailnet path to the hub for a number of minutes (0 turns it off), so the tailnet path can be proven while the robot is on the home network. Not saved on the robot.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("announce"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              text: z.string().min(1).max(400),
              urgent: z.boolean().optional(),
            })
            .strict(),
        })
        .strict()
        .describe(
          "The robot shows a card and says the text aloud. The robot refuses (and says why in its answer) when announcements are off, it is muted, in quiet hours or at night, or the text is empty.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("timer_set"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              seconds: z.number().int().gte(1).lte(86400),
              label: z.string().min(1).max(60).optional(),
            })
            .strict(),
        })
        .strict()
        .describe(
          "The robot starts its own countdown timer, kept on the unit so it rings with no hub (1 second to 24 hours, at most 8 active). The robot answers in the ack state: {ok: true, ...} or {ok: false, error} in plain words.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("alarm_set"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({
              hour: z.number().int().gte(0).lte(23),
              minute: z.number().int().gte(0).lte(59),
              label: z.string().min(1).max(60).optional(),
            })
            .strict(),
        })
        .strict()
        .describe(
          "The robot sets an alarm for the next HH:MM of its own local day. The robot answers in the ack state: {ok: true, ...} or {ok: false, error} in plain words.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("timer_list"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.record(z.string(), z.never()),
        })
        .strict()
        .describe(
          "The robot lists its active timers and alarms with the time left. The robot answers in the ack state: {ok: true, ...} or {ok: false, error} in plain words.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("timer_cancel"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({ id: z.number().int().gte(1).optional() })
            .strict(),
        })
        .strict()
        .describe(
          "The robot cancels one timer by id, or all of them when no id is given. The robot answers in the ack state: {ok: true, ...} or {ok: false, error} in plain words.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("timer_stop"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z.record(z.string(), z.never()),
        })
        .strict()
        .describe(
          "The robot ends the timer that is ringing now. The robot answers in the ack state: {ok: true, ...} or {ok: false, error} in plain words.",
        ),
      z
        .object({
          id: z.string().min(1).max(128),
          kind: z.literal("timer_snooze"),
          issued_at: z.string().datetime({ offset: true }),
          expires_at: z.string().datetime({ offset: true }),
          hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          payload: z
            .object({ seconds: z.number().int().gte(1).lte(3600).optional() })
            .strict(),
        })
        .strict()
        .describe(
          "The robot ends the ringing timer and starts a new one with the same label (default 5 minutes, at most 1 hour). The robot answers in the ack state: {ok: true, ...} or {ok: false, error} in plain words.",
        ),
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
    "A typed hub-to-device command event. The id is stable across replay; payload shape is selected by kind.",
  );
export type DeviceCommand = z.infer<typeof DeviceCommand>;
