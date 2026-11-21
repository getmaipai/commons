// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/git-connection.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**CODE-SPEC-01 (Home docs/design/local-coding-2026-10-17.md section 4.2). A person's link to a git host for Code sessions. The token is a write-only secret held by Home and never on the wire or in this record.*/
export const GitConnection = z
  .object({
    id: z.string().regex(new RegExp("^gitc-[a-z0-9]{6,}$")),
    person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    kind: z.enum(["github", "gitea"]),
    host: z.string().min(1).max(253),
    account: z.string().min(1).max(100),
    status: z.enum(["active", "expired", "revoked", "failing"]),
    expires_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .optional(),
    created_at: z.string().datetime({ offset: true }),
    provenance: z.string().min(1),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
  })
  .strict()
  .describe(
    "CODE-SPEC-01 (Home docs/design/local-coding-2026-10-17.md section 4.2). A person's link to a git host for Code sessions. The token is a write-only secret held by Home and never on the wire or in this record.",
  );
export type GitConnection = z.infer<typeof GitConnection>;
