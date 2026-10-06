// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/presence-state.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The closed activity state shared by the web character, the robot Eyes and the body. It carries no owner identity or reason.*/
export const PresenceState = z
  .enum([
    "idle",
    "present",
    "listening",
    "thinking",
    "working",
    "speaking",
    "asking",
    "done",
    "concerned",
    "sleeping",
    "offline",
  ])
  .describe(
    "The closed activity state shared by the web character, the robot Eyes and the body. It carries no owner identity or reason.",
  );
export type PresenceState = z.infer<typeof PresenceState>;
