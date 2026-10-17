// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/media-presence.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A hub-local projection of timed media playback. It is never synced and carries no title, device name or person id. updated_at uses the hub clock.*/
export const MediaPresence = z
  .object({
    media_id: z.string().regex(new RegExp("^media-")),
    position_s: z.number().gte(0),
    playing: z.boolean(),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict()
  .describe(
    "A hub-local projection of timed media playback. It is never synced and carries no title, device name or person id. updated_at uses the hub clock.",
  );
export type MediaPresence = z.infer<typeof MediaPresence>;
