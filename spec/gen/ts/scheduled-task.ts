// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/scheduled-task.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**
 * SCHED-02 / HOUSE-01: one thing a person asked to happen later or on a repeat: a reminder, a timer, a turn run as the person, a device action or a scene. Design: Home docs/design/smart-home-controls (section 4) and the SCHED-HA-01 conditions D1 to D6 in SCHED-02.
 *
 * RECURRENCE: exactly one of two forms. A one-shot sets `once_at` (a timestamp) and none of `time`, `days`, `zone`. A repeat sets `time` (HH:MM local wall clock), `days` and `zone` (IANA zone) and no `once_at`. `days` uses the alarm record's weekday numbering (ISO, Monday is 1, Sunday is 7), and an empty array means every day (a one-shot uses `once_at`, so empty is not needed for that here). The next-occurrence semantics are Home's `nextOccurrence({ time, days, zone, after })` in backend/src/lib/scheduler.ts; this record adds no second recurrence grammar.
 *
 * CROSS-FIELD RULES (enforced by validateScheduledTask in records/ts/validate.ts and validate_scheduled_task in records/py/validate.py, not by this schema, because neither generator preserves JSON Schema conditionals): (1) exactly one recurrence form; (2) kind `device_action` or `scene` allows executor `hub` or `home_assistant` and requires non-empty `what.targets` and a `what.action`; (3) kind `remind`, `timer` or `turn` requires executor `hub`; (4) `external_ref` never equals `id`.
 *
 * TARGETS: each entry in `what.targets` and `grant_snapshot` is `<instance>/<native id>` per the connector-instances rule (split at the first `/`; no prefix means the `default` instance).
 *
 * EXTERNAL REF: `external_ref` is an opaque random token (for example the id of the Home Assistant automation that runs this task). It is NEVER derived from `id`, so knowing one tells nobody the other.
 *
 * REMOVAL: deleting sets `deleted_at` (a tombstone); the record and its id are kept.
 */
export const ScheduledTask = z
  .object({
    /**Stable record id, never reused.*/
    id: z
      .string()
      .regex(new RegExp("^sched-[a-z0-9]{6,}$"))
      .describe("Stable record id, never reused."),
    /**The person who owns this task.*/
    person: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe("The person who owns this task."),
    /**What the task does when it fires.*/
    kind: z
      .enum(["remind", "timer", "turn", "device_action", "scene"])
      .describe("What the task does when it fires."),
    /**Who fires it. `home_assistant` is only valid for device_action and scene.*/
    executor: z
      .enum(["hub", "home_assistant"])
      .describe(
        "Who fires it. `home_assistant` is only valid for device_action and scene.",
      ),
    /**One-shot form: when it fires. Mutually exclusive with time, days and zone.*/
    once_at: z
      .string()
      .datetime({ offset: true })
      .describe(
        "One-shot form: when it fires. Mutually exclusive with time, days and zone.",
      )
      .optional(),
    /**Repeat form: local wall-clock time in 24-hour HH:MM, same as the alarm record.*/
    time: z
      .string()
      .regex(new RegExp("^([01]\\d|2[0-3]):[0-5]\\d$"))
      .describe(
        "Repeat form: local wall-clock time in 24-hour HH:MM, same as the alarm record.",
      )
      .optional(),
    /**Repeat form: ISO weekdays, Monday is 1 (the alarm record's numbering). Empty means every day.*/
    days: z
      .array(z.number().int().gte(1).lte(7))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "Repeat form: ISO weekdays, Monday is 1 (the alarm record's numbering). Empty means every day.",
      )
      .optional(),
    /**Repeat form: IANA time zone name accepted by Intl.DateTimeFormat.*/
    zone: z
      .string()
      .min(1)
      .max(64)
      .describe(
        "Repeat form: IANA time zone name accepted by Intl.DateTimeFormat.",
      )
      .optional(),
    what: z
      .object({
        /**Entity or scene ids, each `<instance>/<native id>`. Required non-empty for device_action and scene.*/
        targets: z
          .array(z.string().min(1).max(200))
          .max(50)
          .describe(
            "Entity or scene ids, each `<instance>/<native id>`. Required non-empty for device_action and scene.",
          ),
        /**Required for device_action and scene.*/
        action: z
          .enum(["turn_on", "turn_off", "set_brightness", "activate"])
          .describe("Required for device_action and scene.")
          .optional(),
        /**Optional level, for example a brightness percent.*/
        value: z
          .number()
          .gte(1)
          .lte(100)
          .describe("Optional level, for example a brightness percent.")
          .optional(),
        /**For remind, timer and turn: what to say or ask.*/
        text: z
          .string()
          .min(1)
          .max(200)
          .describe("For remind, timer and turn: what to say or ask.")
          .optional(),
      })
      .strict(),
    enabled: z.boolean().default(true),
    state: z.enum(["active", "paused", "failed", "done"]),
    /**Why the task is paused. Absent unless state is paused.*/
    paused_reason: z
      .enum([
        "grant_revoked",
        "scene_changed",
        "automation_unavailable",
        "owner_removed",
      ])
      .describe("Why the task is paused. Absent unless state is paused.")
      .optional(),
    /**Opaque reference to the thing outside the hub that runs this task, such as a Home Assistant automation id. A random token, NEVER derived from `id`, and never equal to it.*/
    external_ref: z
      .string()
      .min(1)
      .max(200)
      .describe(
        "Opaque reference to the thing outside the hub that runs this task, such as a Home Assistant automation id. A random token, NEVER derived from `id`, and never equal to it.",
      )
      .optional(),
    /**The targets the creator could control when the task was created (`<instance>/<native id>`).*/
    grant_snapshot: z
      .array(z.string().min(1).max(200))
      .max(50)
      .describe(
        "The targets the creator could control when the task was created (`<instance>/<native id>`).",
      ),
    /**Where a reminder or timer is delivered. The bot design's field. Absent means hub.*/
    deliver_on: z
      .enum(["hub", "robot", "both"])
      .describe(
        "Where a reminder or timer is delivered. The bot design's field. Absent means hub.",
      )
      .default("hub"),
    /**Tombstone. Null while the task exists.*/
    deleted_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe("Tombstone. Null while the task exists."),
        z.null().describe("Tombstone. Null while the task exists."),
      ])
      .describe("Tombstone. Null while the task exists.")
      .default(null),
    /**How this record came to exist, for example "chat" or "routine".*/
    provenance: z
      .string()
      .min(1)
      .describe(
        'How this record came to exist, for example "chat" or "routine".',
      ),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
  })
  .strict()
  .describe(
    "SCHED-02 / HOUSE-01: one thing a person asked to happen later or on a repeat: a reminder, a timer, a turn run as the person, a device action or a scene. Design: Home docs/design/smart-home-controls (section 4) and the SCHED-HA-01 conditions D1 to D6 in SCHED-02.\n\nRECURRENCE: exactly one of two forms. A one-shot sets `once_at` (a timestamp) and none of `time`, `days`, `zone`. A repeat sets `time` (HH:MM local wall clock), `days` and `zone` (IANA zone) and no `once_at`. `days` uses the alarm record's weekday numbering (ISO, Monday is 1, Sunday is 7), and an empty array means every day (a one-shot uses `once_at`, so empty is not needed for that here). The next-occurrence semantics are Home's `nextOccurrence({ time, days, zone, after })` in backend/src/lib/scheduler.ts; this record adds no second recurrence grammar.\n\nCROSS-FIELD RULES (enforced by validateScheduledTask in records/ts/validate.ts and validate_scheduled_task in records/py/validate.py, not by this schema, because neither generator preserves JSON Schema conditionals): (1) exactly one recurrence form; (2) kind `device_action` or `scene` allows executor `hub` or `home_assistant` and requires non-empty `what.targets` and a `what.action`; (3) kind `remind`, `timer` or `turn` requires executor `hub`; (4) `external_ref` never equals `id`.\n\nTARGETS: each entry in `what.targets` and `grant_snapshot` is `<instance>/<native id>` per the connector-instances rule (split at the first `/`; no prefix means the `default` instance).\n\nEXTERNAL REF: `external_ref` is an opaque random token (for example the id of the Home Assistant automation that runs this task). It is NEVER derived from `id`, so knowing one tells nobody the other.\n\nREMOVAL: deleting sets `deleted_at` (a tombstone); the record and its id are kept.",
  );
export type ScheduledTask = z.infer<typeof ScheduledTask>;
