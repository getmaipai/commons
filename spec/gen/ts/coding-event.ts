// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/coding-event.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**CODE-SPEC-01 (Home docs/design/local-coding-2026-10-17.md section 4.2). One line of a Code session's audit trail: what the agent did. Person scope, owner only, exportable with the session. `secret_found` carries the path and line, never the value. Household logs never carry this record; they hold typed events with no person, text, path or id.*/
export const CodingEvent = z
  .object({
    id: z.string().regex(new RegExp("^cevt-[a-z0-9]{6,}$")),
    session_id: z.string().regex(new RegExp("^csess-[a-z0-9]{6,}$")),
    at: z.string().datetime({ offset: true }),
    kind: z.enum([
      "command",
      "file_write",
      "host_allowed",
      "host_blocked",
      "approval",
      "push",
      "pull_request",
      "secret_found",
      "checkpoint_restored",
      "stopped",
    ]),
    /**The fields for the kind. command: command, exit_code, duration_ms. file_write: path. host_allowed and host_blocked: host. approval: what, answer. push: branch. pull_request: url. secret_found: path, line. checkpoint_restored: checkpoint_id. stopped: reason.*/
    detail: z
      .record(z.string(), z.any())
      .describe(
        "The fields for the kind. command: command, exit_code, duration_ms. file_write: path. host_allowed and host_blocked: host. approval: what, answer. push: branch. pull_request: url. secret_found: path, line. checkpoint_restored: checkpoint_id. stopped: reason.",
      ),
    provenance: z.string().min(1),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
  })
  .strict()
  .describe(
    "CODE-SPEC-01 (Home docs/design/local-coding-2026-10-17.md section 4.2). One line of a Code session's audit trail: what the agent did. Person scope, owner only, exportable with the session. `secret_found` carries the path and line, never the value. Household logs never carry this record; they hold typed events with no person, text, path or id.",
  );
export type CodingEvent = z.infer<typeof CodingEvent>;
