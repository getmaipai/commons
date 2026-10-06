// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/robot-offer.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

export const RobotOffer = z
  .object({
    id: z.string().min(1).max(128),
    person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    tier: z.number().int().gte(1).lte(3),
    text: z.string().min(1).max(500),
    expires_at: z.string().datetime({ offset: true }),
    provenance: z.string().min(1).max(300),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict();
export type RobotOffer = z.infer<typeof RobotOffer>;
