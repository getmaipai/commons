// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/scene.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Runtime-only state for one conversation, held in memory and never stored.*/
export const Scene = z
  .object({
    conversation_id: z.string(),
    people: z.array(
      z
        .object({
          person_id: z.union([
            z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
            z.null(),
          ]),
          label: z.union([z.string(), z.null()]),
          relation: z.enum(["household", "guest", "pet", "unknown"]),
          band: z.enum(["child", "teen", "adult", "unknown"]),
          level: z.enum(["confirmed", "tentative", "claimed"]),
          basis: z
            .array(
              z.enum([
                "face",
                "voice",
                "typed",
                "look",
                "gps",
                "ha_entity",
                "robot_room",
                "signed_in",
                "sound",
                "light",
                "temperature",
                "motion",
              ]),
            )
            .min(1),
          last_seen_at: z.number(),
          expires_at: z.number(),
        })
        .strict(),
    ),
    speaker: z.union([
      z
        .object({
          person: z.union([
            z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
            z.null(),
          ]),
          basis: z.enum([
            "signed_in",
            "voice",
            "face",
            "voice_and_face",
            "claimed",
            "unknown",
          ]),
          level: z.enum(["confirmed", "tentative", "unknown"]),
        })
        .strict(),
      z.null(),
    ]),
    place: z.union([
      z
        .object({
          where: z.enum(["home", "away", "unknown"]),
          setting: z.enum(["indoor", "outdoor", "vehicle", "unknown"]),
          area: z.union([z.string(), z.null()]),
          precision: z.enum(["area", "room"]),
          basis: z.enum([
            "face",
            "voice",
            "typed",
            "look",
            "gps",
            "ha_entity",
            "robot_room",
            "signed_in",
            "sound",
            "light",
            "temperature",
            "motion",
          ]),
          expires_at: z.number(),
        })
        .strict(),
      z.null(),
    ]),
    ambient: z.union([
      z
        .object({
          light: z.object({ bucket: z.string() }).strict().optional(),
          temperature: z.object({ bucket: z.string() }).strict().optional(),
          noise: z.object({ bucket: z.string() }).strict().optional(),
          events: z.array(
            z
              .object({ class: z.string(), score: z.number().gte(0).lte(1) })
              .strict(),
          ),
        })
        .strict(),
      z.null(),
    ]),
    weather: z.union([z.record(z.string(), z.any()), z.null()]),
    alone: z.boolean(),
    child_present: z.boolean(),
    updated_at: z.number(),
  })
  .strict()
  .describe(
    "Runtime-only state for one conversation, held in memory and never stored.",
  );
export type Scene = z.infer<typeof Scene>;
