// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/alarm.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A person's local-time alarm. An empty days array means a one-time alarm. An occurrence before skip_until is skipped.*/
export const Alarm = z
  .object({
    /**Stable id, never reused, even after deleted_at is set.*/
    id: z
      .string()
      .regex(new RegExp("^alarm-[a-z0-9]{6,}$"))
      .describe("Stable id, never reused, even after deleted_at is set."),
    /**Person who owns this alarm.*/
    person: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe("Person who owns this alarm."),
    /**Local wall-clock time in 24-hour HH:MM form.*/
    time: z
      .string()
      .regex(new RegExp("^([01]\\d|2[0-3]):[0-5]\\d$"))
      .describe("Local wall-clock time in 24-hour HH:MM form."),
    /**ISO weekdays, Monday is 1. Empty means a one-time alarm.*/
    days: z
      .array(z.number().int().gte(1).lte(7))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe("ISO weekdays, Monday is 1. Empty means a one-time alarm."),
    label: z.string().max(120),
    tag: z.string().max(40),
    enabled: z.boolean().default(true),
    /**An occurrence before this instant is skipped.*/
    skip_until: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe("An occurrence before this instant is skipped."),
        z.null().describe("An occurrence before this instant is skipped."),
      ])
      .describe("An occurrence before this instant is skipped.")
      .default(null),
    sound: z.enum([
      "default",
      "none",
      "bell",
      "chime",
      "digital",
      "rise",
      "gentle",
      "gentle_wake",
    ]),
    /**Null means use the person's default snooze duration.*/
    snooze_minutes: z
      .union([
        z.literal(5),
        z.literal(10),
        z.literal(15),
        z.literal(30),
        z.literal(60),
        z.literal(null),
      ])
      .describe("Null means use the person's default snooze duration."),
    source: z.enum(["hub", "local"]),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    deleted_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .default(null),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe(
    "A person's local-time alarm. An empty days array means a one-time alarm. An occurrence before skip_until is skipped.",
  );
export type Alarm = z.infer<typeof Alarm>;
