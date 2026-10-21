// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/api-key.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One personal key for voice, Home Assistant or coding. The secret and its peppered hash stay in Home and never reach this record. Home checks expiry, current controls and grants on each request. Up to 10 keys per adult, 3 per minor. Coding keys suspend when access is removed or a required piece is missing.*/
export const ApiKey = z
  .object({
    id: z.string().regex(new RegExp("^key_[a-z0-9]{6,}$")),
    person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    name: z.string().min(1).max(60),
    scopes: z
      .array(z.enum(["turn", "code", "settings"]))
      .min(1)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      ),
    created_at: z.string().datetime({ offset: true }),
    /**Required. Home offers 7, 30, 90 (default) or 365 days. A minor has at most 30 days.*/
    expires_at: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Required. Home offers 7, 30, 90 (default) or 365 days. A minor has at most 30 days.",
      ),
    revoked_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .optional(),
    status: z.enum(["active", "expired", "revoked", "suspended"]),
    /**Visible to the owner only.*/
    last_used_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe("Visible to the owner only."),
        z.null().describe("Visible to the owner only."),
      ])
      .describe("Visible to the owner only.")
      .optional(),
    /**Visible to the owner only. Lists show the place, never the address.*/
    last_used_from: z
      .union([
        z
          .object({
            place: z.enum(["home_network", "away"]),
            address: z.union([z.any(), z.any()]),
          })
          .strict()
          .describe(
            "Visible to the owner only. Lists show the place, never the address.",
          ),
        z
          .null()
          .describe(
            "Visible to the owner only. Lists show the place, never the address.",
          ),
      ])
      .describe(
        "Visible to the owner only. Lists show the place, never the address.",
      )
      .optional(),
    /**Starts at the household rate limit.*/
    limits: z
      .object({ requests_per_minute: z.number().int().gte(1) })
      .strict()
      .describe("Starts at the household rate limit."),
    hint: z.string().min(4).max(4),
    provenance: z.string().min(1),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe(
    "One personal key for voice, Home Assistant or coding. The secret and its peppered hash stay in Home and never reach this record. Home checks expiry, current controls and grants on each request. Up to 10 keys per adult, 3 per minor. Coding keys suspend when access is removed or a required piece is missing.",
  );
export type ApiKey = z.infer<typeof ApiKey>;
