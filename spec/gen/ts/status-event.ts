// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/status-event.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One row in the append-only history of a status page component's state changes. A row is written only when a component's state changes, plus the boot-gap pair for the hub. The duration of a state is the gap to the next row of the same component and is never stored. The hub prunes rows older than 90 days. A component with no rows is treated as operational since the earliest row of any component; this is a display rule, not enforceable in the schema.*/
export const StatusEvent = z
  .object({
    id: z.string().regex(new RegExp("^sev-[a-z0-9]{6,}$")),
    component: z.union([
      z.enum([
        "chat",
        "embed",
        "background",
        "voice",
        "library",
        "hub",
        "internet",
      ]),
      z.string().regex(new RegExp("^service:[a-z0-9][a-z0-9_-]{0,63}$")),
    ]),
    state: z.enum(["operational", "degraded", "outage", "maintenance"]),
    /**When the component entered this state.*/
    at: z
      .string()
      .datetime({ offset: true })
      .describe("When the component entered this state."),
    /**sample: the hub's periodic check saw it; boot_gap: written at boot to record the hub itself was not running; maintenance: derived from a scheduled window.*/
    source: z
      .enum(["sample", "boot_gap", "maintenance"])
      .describe(
        "sample: the hub's periodic check saw it; boot_gap: written at boot to record the hub itself was not running; maintenance: derived from a scheduled window.",
      ),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
    /**Plain words with no technical detail.*/
    detail: z
      .union([
        z.string().max(200).describe("Plain words with no technical detail."),
        z.null().describe("Plain words with no technical detail."),
      ])
      .describe("Plain words with no technical detail.")
      .default(null),
  })
  .strict()
  .describe(
    "One row in the append-only history of a status page component's state changes. A row is written only when a component's state changes, plus the boot-gap pair for the hub. The duration of a state is the gap to the next row of the same component and is never stored. The hub prunes rows older than 90 days. A component with no rows is treated as operational since the earliest row of any component; this is a display rule, not enforceable in the schema.",
  );
export type StatusEvent = z.infer<typeof StatusEvent>;
