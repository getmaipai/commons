// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/link-state.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The state of Home's link to the engine computer (the Stack on another computer). `state` is what a person sees; `reason` is an error code from spec/errors/errors.json (one of the link_* codes) and is present only when the state is not ready; `path` is how the link is reached; `rtt_ms` is the last round trip; `last_ok_at` is when the link last worked; `contract` is the Stack contract version the engine computer reports. A field Home cannot know yet is absent, never null.*/
export const LinkState = z
  .object({
    state: z.enum([
      "connecting",
      "ready",
      "degraded",
      "reconnecting",
      "offline",
    ]),
    /**Why the link is not ready. Every value is a code in spec/errors/errors.json.*/
    reason: z
      .enum([
        "link_refused",
        "link_timeout",
        "link_dns",
        "link_auth_refused",
        "link_host_key_changed",
        "link_needs_update",
        "link_not_paired",
        "link_outside_home",
        "link_stack_down",
      ])
      .describe(
        "Why the link is not ready. Every value is a code in spec/errors/errors.json.",
      )
      .optional(),
    /**`home` is the household network; `tailnet` needs engines.stack.remote.allow_tailnet.*/
    path: z
      .enum(["home", "tailnet"])
      .describe(
        "`home` is the household network; `tailnet` needs engines.stack.remote.allow_tailnet.",
      )
      .optional(),
    rtt_ms: z.number().int().gte(0).optional(),
    last_ok_at: z.string().datetime({ offset: true }).optional(),
    contract: z.string().min(1),
  })
  .strict()
  .describe(
    "The state of Home's link to the engine computer (the Stack on another computer). `state` is what a person sees; `reason` is an error code from spec/errors/errors.json (one of the link_* codes) and is present only when the state is not ready; `path` is how the link is reached; `rtt_ms` is the last round trip; `last_ok_at` is when the link last worked; `contract` is the Stack contract version the engine computer reports. A field Home cannot know yet is absent, never null.",
  );
export type LinkState = z.infer<typeof LinkState>;
