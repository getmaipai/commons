// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/coding-session.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**CODE-SPEC-01 and CODE-TIER-01 (Home docs/design/local-coding-2026-10-17.md section 4.2, code-session-tiers-2026-11-21.md section 3.1). One Code app session, person scope and owner only. `tier` is the person's stored choice and holds across turns and restarts; each turn still clamps it to what the person may run, and Home writes the corrected value back. `model_id` is provenance, never a choice: Home writes the model that answered the last turn from the Stack's reply and never maps a tier to a model. The transcript is the session's message list in the chat message-part shape and is stored like a conversation, not in this record.*/
export const CodingSession = z
  .object({
    id: z.string().regex(new RegExp("^csess-[a-z0-9]{6,}$")),
    person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    title: z.string().min(1).max(120),
    repo: z
      .object({
        kind: z.enum(["github", "gitea", "hub_folder", "none"]),
        /**The git-connection used for github and gitea repositories.*/
        connection_id: z
          .string()
          .regex(new RegExp("^gitc-[a-z0-9]{6,}$"))
          .describe(
            "The git-connection used for github and gitea repositories.",
          )
          .optional(),
        /**owner/name on the git host.*/
        full_name: z
          .string()
          .min(1)
          .max(200)
          .describe("owner/name on the git host.")
          .optional(),
        /**Relative path inside the household folder, for hub_folder.*/
        path: z
          .string()
          .min(1)
          .max(500)
          .describe(
            "Relative path inside the household folder, for hub_folder.",
          )
          .optional(),
        base_branch: z.string().min(1).max(200),
        work_branch: z.string().min(1).max(200),
      })
      .strict(),
    environment_id: z.string().regex(new RegExp("^cenv-[a-z0-9]{6,}$")),
    mode: z.enum(["plan", "ask", "auto_edit"]),
    state: z.enum([
      "queued",
      "starting",
      "working",
      "needs_you",
      "idle",
      "paused",
      "done",
      "failed",
      "archived",
    ]),
    /**The person's stored choice. Switching writes it at once and takes effect at the next turn, never in the middle of one. Reduced is applied by the system only and is never stored here.*/
    tier: z
      .enum(["standard", "boost", "max"])
      .describe(
        "The person's stored choice. Switching writes it at once and takes effect at the next turn, never in the middle of one. Reduced is applied by the system only and is never stored here.",
      )
      .default("standard"),
    network: z
      .object({
        /**none: the sandbox reaches only the gateway. hosts: it also reaches the listed hosts through the egress proxy.*/
        policy: z
          .enum(["none", "hosts"])
          .describe(
            "none: the sandbox reaches only the gateway. hosts: it also reaches the listed hosts through the egress proxy.",
          ),
        hosts: z
          .array(
            z
              .string()
              .regex(new RegExp("^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$"))
              .min(1)
              .max(253),
          )
          .refine(
            (arr) => arr.every((item, i) => arr.indexOf(item) == i),
            "All items must be unique!",
          ),
      })
      .strict(),
    /**Household storage file ids mounted read only.*/
    mounts: z
      .array(z.string().regex(new RegExp("^file-[a-z0-9]{6,}$")))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe("Household storage file ids mounted read only.")
      .optional(),
    /**Provenance written by Home from the Stack's reply: the catalog id of the model that answered the last turn. Absent before the first turn. Never a choice and never read to pick a model.*/
    model_id: z
      .string()
      .regex(new RegExp("^[A-Za-z0-9][A-Za-z0-9._:/-]*$"))
      .min(1)
      .max(200)
      .describe(
        "Provenance written by Home from the Stack's reply: the catalog id of the model that answered the last turn. Absent before the first turn. Never a choice and never read to pick a model.",
      )
      .optional(),
    usage: z
      .object({
        input_tokens: z.number().int().gte(0),
        output_tokens: z.number().int().gte(0),
      })
      .strict(),
    changes: z
      .object({
        files: z.number().int().gte(0),
        additions: z.number().int().gte(0),
        deletions: z.number().int().gte(0),
      })
      .strict(),
    pull_request: z
      .union([
        z
          .object({
            url: z.string().url(),
            number: z.number().int().gte(1),
            draft: z.boolean(),
          })
          .strict(),
        z.null(),
      ])
      .optional(),
    checkpoints: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            at: z.string().datetime({ offset: true }),
            label: z.string().min(1).max(120),
            files: z.number().int().gte(0),
          })
          .strict(),
      )
      .optional(),
    created_at: z.string().datetime({ offset: true }),
    last_activity_at: z.string().datetime({ offset: true }),
    deleted_at: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .optional(),
    trash_until: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .optional(),
    provenance: z.string().min(1),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
  })
  .strict()
  .describe(
    "CODE-SPEC-01 and CODE-TIER-01 (Home docs/design/local-coding-2026-10-17.md section 4.2, code-session-tiers-2026-11-21.md section 3.1). One Code app session, person scope and owner only. `tier` is the person's stored choice and holds across turns and restarts; each turn still clamps it to what the person may run, and Home writes the corrected value back. `model_id` is provenance, never a choice: Home writes the model that answered the last turn from the Stack's reply and never maps a tier to a model. The transcript is the session's message list in the chat message-part shape and is stored like a conversation, not in this record.",
  );
export type CodingSession = z.infer<typeof CodingSession>;
