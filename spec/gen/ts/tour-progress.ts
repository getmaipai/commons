// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/tour-progress.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One per-person tour completion record, following synced-record provenance, date-time and hybrid logical clock conventions.*/
export const TourProgress = z
  .object({
    id: z.string().regex(new RegExp("^tour-progress-[a-z0-9]{6,}$")),
    person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    tour_id: z.string().min(1),
    package_id: z.string().regex(new RegExp("^[a-z0-9][a-z0-9_-]{0,63}$")),
    version: z.number().int().gte(1),
    status: z.enum(["completed", "skipped", "dismissed"]),
    step_reached: z.string().min(1),
    at: z.string().datetime({ offset: true }),
    /**Provenance: hub, or the id of the device that showed the tour.*/
    source: z
      .string()
      .regex(new RegExp("^(hub|[a-z0-9][a-z0-9-]{0,63})$"))
      .describe(
        "Provenance: hub, or the id of the device that showed the tour.",
      ),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    provenance: z.string().min(1),
  })
  .strict()
  .describe(
    "One per-person tour completion record, following synced-record provenance, date-time and hybrid logical clock conventions.",
  );
export type TourProgress = z.infer<typeof TourProgress>;
