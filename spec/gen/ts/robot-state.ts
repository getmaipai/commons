// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/robot-state.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A hub-local projection of a paired robot's current state, keyed externally by device_id and never synced or given its own record identity (home docs/dev.md, ‘Robot device state’; bot docs/dev.md, ‘Robot device state’ pointer). It deliberately has no id, timestamps, or hlc. Battery, daemon and app version fields may be omitted by producers that do not report them yet; explicit null means the body cannot tell or has no version to report. Reachy Mini always sends null for on_battery per section 7 of the design record.*/
export const RobotState = z
  .object({
    /**The robot's current interaction phase, so the hub can show an accurate Devices-page card, including the distinct startup state. reconnecting means the robot lost the hub link and is trying to restore it. sleeping means the robot is deliberately idle, not unreachable. A consumer that meets an activity value it does not know treats it as unknown, not as an error.*/
    activity: z
      .enum([
        "starting",
        "idle",
        "listening",
        "thinking",
        "speaking",
        "reconnecting",
        "sleeping",
      ])
      .describe(
        "The robot's current interaction phase, so the hub can show an accurate Devices-page card, including the distinct startup state. reconnecting means the robot lost the hub link and is trying to restore it. sleeping means the robot is deliberately idle, not unreachable. A consumer that meets an activity value it does not know treats it as unknown, not as an error.",
      ),
    /**Whether the robot's microphone is muted, so the card can show when it cannot hear the household.*/
    muted: z
      .boolean()
      .describe(
        "Whether the robot's microphone is muted, so the card can show when it cannot hear the household.",
      ),
    /**Whether the robot's tracking behavior is active, so the card can expose that live device state.*/
    tracking: z
      .boolean()
      .describe(
        "Whether the robot's tracking behavior is active, so the card can expose that live device state.",
      ),
    /**Whether the robot is running on battery power. Null means its body cannot tell; Reachy Mini always sends null per section 7 of the design record. Omission means the producer does not yet report this field.*/
    on_battery: z
      .union([
        z
          .boolean()
          .describe(
            "Whether the robot is running on battery power. Null means its body cannot tell; Reachy Mini always sends null per section 7 of the design record. Omission means the producer does not yet report this field.",
          ),
        z
          .null()
          .describe(
            "Whether the robot is running on battery power. Null means its body cannot tell; Reachy Mini always sends null per section 7 of the design record. Omission means the producer does not yet report this field.",
          ),
      ])
      .describe(
        "Whether the robot is running on battery power. Null means its body cannot tell; Reachy Mini always sends null per section 7 of the design record. Omission means the producer does not yet report this field.",
      )
      .optional(),
    /**The available battery fraction from 0 to 1, allowing the Devices-page card to show charge when the robot reports it. Null means no level is currently known; omission means the producer does not yet report this field.*/
    battery_level: z
      .union([
        z
          .number()
          .gte(0)
          .lte(1)
          .describe(
            "The available battery fraction from 0 to 1, allowing the Devices-page card to show charge when the robot reports it. Null means no level is currently known; omission means the producer does not yet report this field.",
          ),
        z
          .null()
          .describe(
            "The available battery fraction from 0 to 1, allowing the Devices-page card to show charge when the robot reports it. Null means no level is currently known; omission means the producer does not yet report this field.",
          ),
      ])
      .describe(
        "The available battery fraction from 0 to 1, allowing the Devices-page card to show charge when the robot reports it. Null means no level is currently known; omission means the producer does not yet report this field.",
      )
      .optional(),
    /**The robot daemon version, when available, so the hub can display which software is running. Null means no version is currently known; omission means the producer does not yet report this field.*/
    daemon_version: z
      .union([
        z
          .string()
          .describe(
            "The robot daemon version, when available, so the hub can display which software is running. Null means no version is currently known; omission means the producer does not yet report this field.",
          ),
        z
          .null()
          .describe(
            "The robot daemon version, when available, so the hub can display which software is running. Null means no version is currently known; omission means the producer does not yet report this field.",
          ),
      ])
      .describe(
        "The robot daemon version, when available, so the hub can display which software is running. Null means no version is currently known; omission means the producer does not yet report this field.",
      )
      .optional(),
    /**Whether the body is resting on a surface or being held, so the hub can show when someone is carrying the robot. Null means the body cannot tell; omission means the producer does not yet report this field. A consumer that meets a value it does not know treats it as unknown, not as an error.*/
    motion: z
      .union([z.literal("resting"), z.literal("held"), z.literal(null)])
      .describe(
        "Whether the body is resting on a surface or being held, so the hub can show when someone is carrying the robot. Null means the body cannot tell; omission means the producer does not yet report this field. A consumer that meets a value it does not know treats it as unknown, not as an error.",
      )
      .optional(),
    /**How many times the robot has been put down since it started, a non-negative running count the hub can compare between frames. Omission means the producer does not yet report this field.*/
    put_down_count: z
      .number()
      .int()
      .gte(0)
      .describe(
        "How many times the robot has been put down since it started, a non-negative running count the hub can compare between frames. Omission means the producer does not yet report this field.",
      )
      .optional(),
    /**The MaiPai app version the robot runs (the maipai-bot release), so the hub can compare the robot to a published Bot release; daemon_version is the vendor SDK's version, not this one. Null means no version is currently known; omission means the producer does not yet report this field.*/
    app_version: z
      .union([
        z
          .string()
          .describe(
            "The MaiPai app version the robot runs (the maipai-bot release), so the hub can compare the robot to a published Bot release; daemon_version is the vendor SDK's version, not this one. Null means no version is currently known; omission means the producer does not yet report this field.",
          ),
        z
          .null()
          .describe(
            "The MaiPai app version the robot runs (the maipai-bot release), so the hub can compare the robot to a published Bot release; daemon_version is the vendor SDK's version, not this one. Null means no version is currently known; omission means the producer does not yet report this field.",
          ),
      ])
      .describe(
        "The MaiPai app version the robot runs (the maipai-bot release), so the hub can compare the robot to a published Bot release; daemon_version is the vendor SDK's version, not this one. Null means no version is currently known; omission means the producer does not yet report this field.",
      )
      .optional(),
  })
  .strict()
  .describe(
    "A hub-local projection of a paired robot's current state, keyed externally by device_id and never synced or given its own record identity (home docs/dev.md, ‘Robot device state’; bot docs/dev.md, ‘Robot device state’ pointer). It deliberately has no id, timestamps, or hlc. Battery, daemon and app version fields may be omitted by producers that do not report them yet; explicit null means the body cannot tell or has no version to report. Reachy Mini always sends null for on_battery per section 7 of the design record.",
  );
export type RobotState = z.infer<typeof RobotState>;
