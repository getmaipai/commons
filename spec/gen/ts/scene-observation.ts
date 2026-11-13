// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/scene-observation.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Runtime-only scene input held in memory for one conversation; never stored as a record.*/
export const SceneObservation = z
  .object({
    id: z.string().min(1),
    source: z
      .object({
        surface: z.enum(["chat", "overlay", "pod", "robot", "tv", "phone"]),
        device_id: z.union([z.string(), z.null()]),
        sensor: z.enum([
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
      })
      .strict(),
    kind: z.enum([
      "person_here",
      "person_left",
      "place",
      "room",
      "people_count",
      "light",
      "sound_event",
      "temperature",
      "motion",
      "door",
      "weather",
      "weather_alert",
    ]),
    value: z.any(),
    confidence: z.number().gte(0).lte(1),
    strength: z.enum(["strong", "weak"]),
    at: z.number(),
    expires_at: z.number(),
  })
  .strict()
  .and(
    z.any().superRefine((x, ctx) => {
      const schemas = [
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("person_here"),
            value: z
              .object({
                person_id: z.union([
                  z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
                  z.null(),
                ]),
                label: z.union([z.string(), z.null()]),
                relation: z.enum(["household", "guest", "pet", "unknown"]),
                band: z.enum(["child", "teen", "adult", "unknown"]),
                level: z.enum(["confirmed", "tentative", "claimed"]),
              })
              .strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("person_left"),
            value: z
              .object({
                person_id: z.union([
                  z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
                  z.null(),
                ]),
                label: z.union([z.string(), z.null()]),
                relation: z.enum(["household", "guest", "pet", "unknown"]),
                band: z.enum(["child", "teen", "adult", "unknown"]),
                level: z.enum(["confirmed", "tentative", "claimed"]),
              })
              .strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("place"),
            value: z
              .object({
                where: z.enum(["home", "away", "unknown"]),
                setting: z.enum(["indoor", "outdoor", "vehicle", "unknown"]),
                area: z.union([z.string(), z.null()]),
                precision: z.enum(["area", "room"]),
              })
              .strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("room"),
            value: z.object({ room: z.string() }).strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("people_count"),
            value: z.number().gte(0),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("light"),
            value: z.object({ bucket: z.string() }).strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("sound_event"),
            value: z
              .object({ class: z.string(), score: z.number().gte(0).lte(1) })
              .strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("temperature"),
            value: z.object({ bucket: z.string() }).strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("motion"),
            value: z
              .object({
                state: z.enum([
                  "still",
                  "bumped",
                  "lifted",
                  "carried",
                  "set_down",
                  "shaken",
                  "tilted",
                  "tapped",
                  "falling",
                  "rolling",
                ]),
                pose: z
                  .enum([
                    "upright",
                    "left_side",
                    "right_side",
                    "upside_down",
                    "face_down",
                    "on_back",
                  ])
                  .optional(),
              })
              .strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("door"),
            value: z.object({ bucket: z.string() }).strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("weather"),
            value: z.object({ bucket: z.string() }).strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
          })
          .strict(),
        z
          .object({
            id: z.string().min(1),
            source: z
              .object({
                surface: z.enum([
                  "chat",
                  "overlay",
                  "pod",
                  "robot",
                  "tv",
                  "phone",
                ]),
                device_id: z.union([z.string(), z.null()]),
                sensor: z.enum([
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
              })
              .strict(),
            kind: z.literal("weather_alert"),
            value: z.object({ bucket: z.string() }).strict(),
            confidence: z.number().gte(0).lte(1),
            strength: z.enum(["strong", "weak"]),
            at: z.number(),
            expires_at: z.number(),
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
    }),
  )
  .describe(
    "Runtime-only scene input held in memory for one conversation; never stored as a record.",
  );
export type SceneObservation = z.infer<typeof SceneObservation>;
