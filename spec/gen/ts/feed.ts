// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/feed.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A household-configured news feed and its polling state.*/
export const Feed = z
  .object({
    id: z.string().regex(new RegExp("^feed-[a-z0-9]{6,}$")),
    url: z.string().url(),
    title: z.string().min(1),
    /**Registrable domain of the publisher.*/
    publisher: z
      .string()
      .min(1)
      .describe("Registrable domain of the publisher."),
    band: z.enum(["child", "teen", "adult"]),
    package_id: z.string().min(1).optional(),
    person_id: z.string().min(1).optional(),
    etag: z.string().optional(),
    last_modified: z.string().optional(),
    poll_interval_s: z.number().int().gte(900),
    next_poll_at: z.string().datetime({ offset: true }),
    fail_count: z.number().int().gte(0),
    quiet_until: z.string().datetime({ offset: true }).optional(),
    enabled: z.boolean(),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
    provenance: z.string().min(1),
  })
  .strict()
  .describe("A household-configured news feed and its polling state.");
export type Feed = z.infer<typeof Feed>;
