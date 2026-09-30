// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/maintenance-window.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Scheduled maintenance. Status is derived at read time from the clock and cancelled_at (scheduled -> in_progress -> completed, or cancelled), never stored. ends_at must be after starts_at; JSON Schema cannot express this, so the hub enforces it. Recurrence is deliberately not modeled yet; a later shape may add strategy.*/
export const MaintenanceWindow = z
  .object({
    id: z.string().regex(new RegExp("^maint-[a-z0-9]{6,}$")),
    title: z.string().min(1).max(120),
    components: z
      .array(z.enum(["chat", "embed", "background", "voice", "library", "hub"]))
      .min(1)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      ),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    created_by: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    created_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
    description: z.string().max(1000).default(""),
    cancelled_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .default(null),
  })
  .strict()
  .describe(
    "Scheduled maintenance. Status is derived at read time from the clock and cancelled_at (scheduled -> in_progress -> completed, or cancelled), never stored. ends_at must be after starts_at; JSON Schema cannot express this, so the hub enforces it. Recurrence is deliberately not modeled yet; a later shape may add strategy.",
  );
export type MaintenanceWindow = z.infer<typeof MaintenanceWindow>;
