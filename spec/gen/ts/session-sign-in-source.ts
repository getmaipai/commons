// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/session-sign-in-source.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**How a browser or device session signed in: 'local' on the home network or the hub computer (the default for any session recorded before this field existed), 'away' through the household's private Tailscale address, 'paired_device' by redeeming a paired device's token. The hub sets it on the server when it issues the session, once; a client never supplies it and it has no update path. Only the signed-in person reads it, for their own sessions.*/
export const SessionSignInSource = z
  .enum(["local", "away", "paired_device"])
  .describe(
    "How a browser or device session signed in: 'local' on the home network or the hub computer (the default for any session recorded before this field existed), 'away' through the household's private Tailscale address, 'paired_device' by redeeming a paired device's token. The hub sets it on the server when it issues the session, once; a client never supplies it and it has no update path. Only the signed-in person reads it, for their own sessions.",
  )
  .default("local");
export type SessionSignInSource = z.infer<typeof SessionSignInSource>;
