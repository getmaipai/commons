// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/status-note.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One plain-text note an admin pins to the status page. At most one uncleared, unexpired note is shown at a time; that is a display rule, not enforceable in this schema.*/
export const StatusNote = z
  .object({
    id: z.string().regex(new RegExp("^note-[a-z0-9]{6,}$")),
    /**Plain text only, with no markup.*/
    body: z
      .string()
      .min(1)
      .max(500)
      .describe("Plain text only, with no markup."),
    posted_by: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    posted_at: z.string().datetime({ offset: true }),
    expires_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .default(null),
    cleared_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .default(null),
    cleared_by: z
      .union([z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")), z.null()])
      .default(null),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
  })
  .strict()
  .describe(
    "One plain-text note an admin pins to the status page. At most one uncleared, unexpired note is shown at a time; that is a display rule, not enforceable in this schema.",
  );
export type StatusNote = z.infer<typeof StatusNote>;
