// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/household-voice.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**VOICES-03: a voice an owner or admin made from one reference clip (6 to 30 seconds), usable by the whole household once made. The hub is the master: it keeps this record and the clip, and sends the clip to the voice engine with each request. No consent block: creation is admin-only and unrestricted (SAFETY.md, owner-approved 2026-10-18). `temperature` is the sampling temperature handed to the Chatterbox Turbo engine for this voice (0.1 to 2.0; absent means the engine default); it was chosen by ear at 1.05 for the robot voice, and a higher value also raises pitch. `pitch_semitones` shifts the rendered audio after generation with formants kept (-12 to 12; absent means 0), because a clone can come out one or two semitones off its reference. Both are set by the person making the voice and are the voice's own, never a request parameter.*/
export const HouseholdVoice = z
  .object({
    /**Also the value a person's `tts.voice_id` and a robot's `robot.voice.id` hold: a plain token, never an address.*/
    id: z
      .string()
      .regex(new RegExp("^voice-[a-z0-9]{6,}$"))
      .describe(
        "Also the value a person's `tts.voice_id` and a robot's `robot.voice.id` hold: a plain token, never an address.",
      ),
    /**The name the household sees, such as 'Cutey'.*/
    label: z
      .string()
      .min(1)
      .max(60)
      .describe("The name the household sees, such as 'Cutey'."),
    /**The owner or admin who made the voice (provenance).*/
    created_by: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe("The owner or admin who made the voice (provenance)."),
    /**Size of the stored reference clip.*/
    bytes: z
      .number()
      .int()
      .gte(1)
      .describe("Size of the stored reference clip."),
    /**Length of the reference clip; null for a voice made before the length was recorded.*/
    duration_seconds: z
      .union([
        z
          .number()
          .gte(6)
          .lte(30)
          .describe(
            "Length of the reference clip; null for a voice made before the length was recorded.",
          ),
        z
          .null()
          .describe(
            "Length of the reference clip; null for a voice made before the length was recorded.",
          ),
      ])
      .describe(
        "Length of the reference clip; null for a voice made before the length was recorded.",
      )
      .default(null),
    /**Sampling temperature for this voice; absent means the engine default.*/
    temperature: z
      .number()
      .gte(0.1)
      .lte(2)
      .describe(
        "Sampling temperature for this voice; absent means the engine default.",
      )
      .optional(),
    /**Pitch offset in semitones applied to the rendered audio, formants kept; absent means 0.*/
    pitch_semitones: z
      .number()
      .gte(-12)
      .lte(12)
      .describe(
        "Pitch offset in semitones applied to the rendered audio, formants kept; absent means 0.",
      )
      .optional(),
    created_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe(
        "Hybrid logical clock: wall_ms:counter:node (7.3), the same shape every other synced record type uses.",
      ),
  })
  .strict()
  .describe(
    "VOICES-03: a voice an owner or admin made from one reference clip (6 to 30 seconds), usable by the whole household once made. The hub is the master: it keeps this record and the clip, and sends the clip to the voice engine with each request. No consent block: creation is admin-only and unrestricted (SAFETY.md, owner-approved 2026-10-18). `temperature` is the sampling temperature handed to the Chatterbox Turbo engine for this voice (0.1 to 2.0; absent means the engine default); it was chosen by ear at 1.05 for the robot voice, and a higher value also raises pitch. `pitch_semitones` shifts the rendered audio after generation with formants kept (-12 to 12; absent means 0), because a clone can come out one or two semitones off its reference. Both are set by the person making the voice and are the voice's own, never a request parameter.",
  );
export type HouseholdVoice = z.infer<typeof HouseholdVoice>;
