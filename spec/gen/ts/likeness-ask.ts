// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/likeness-ask.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**PERUSE-2026-10-25. One ask for a pictured household adult's consent to a single picture or video of adult content that looks like them. The pictured adult reads the exact prompt on a card and clicks Consent or Decline; one ask covers one generation. The prompt text is never in this record, only its SHA-256, so the record can be kept as the audit trail.*/
export const LikenessAsk = z
  .object({
    id: z.string().min(1),
    /**The household adult who is asked.*/
    subject_person_id: z
      .string()
      .min(1)
      .describe("The household adult who is asked."),
    /**The adult who asked for the picture or video.*/
    requester_person_id: z
      .string()
      .min(1)
      .describe("The adult who asked for the picture or video."),
    medium: z.enum(["picture", "video"]),
    /**style: a saved style of the person. Adult content from a photo is never allowed.*/
    way: z
      .literal("style")
      .describe(
        "style: a saved style of the person. Adult content from a photo is never allowed.",
      ),
    state: z.enum([
      "waiting",
      "approved",
      "declined",
      "expired",
      "consumed",
      "cancelled",
    ]),
    /**SHA-256 of the exact prompt shown on the card.*/
    prompt_sha256: z
      .string()
      .regex(new RegExp("^[0-9a-f]{64}$"))
      .describe("SHA-256 of the exact prompt shown on the card."),
    /**Where the request was made; this is the record provenance.*/
    source: z
      .enum(["chat", "editor"])
      .describe("Where the request was made; this is the record provenance."),
    decided_at: z.string().datetime({ offset: true }).optional(),
    /**Which of the two accounts the click was made from. Home does not check who holds the device.*/
    decided_by: z
      .enum(["subject", "requester"])
      .describe(
        "Which of the two accounts the click was made from. Home does not check who holds the device.",
      )
      .optional(),
    consumed_at: z.string().datetime({ offset: true }).optional(),
    expires_at: z.string().datetime({ offset: true }).optional(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
  })
  .strict()
  .describe(
    "PERUSE-2026-10-25. One ask for a pictured household adult's consent to a single picture or video of adult content that looks like them. The pictured adult reads the exact prompt on a card and clicks Consent or Decline; one ask covers one generation. The prompt text is never in this record, only its SHA-256, so the record can be kept as the audit trail.",
  );
export type LikenessAsk = z.infer<typeof LikenessAsk>;
