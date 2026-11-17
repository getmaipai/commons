// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/settings-change.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**SETTINGS-AUDIT-01: one record of an owner or admin changing a safety-relevant setting (a key that widens or narrows what a child or teen can reach, or a role default or override under the content filter, Home RULES.md area 'Content filter and feature access'). Shown to owners and admins. Rule 6a: the record carries the actor's role, never a person id or name, and for a per-person key it says only that the scope was a person. The hub writes one per accepted write; a refused write leaves none.*/
export const SettingsChange = z
  .object({
    id: z.string().regex(new RegExp("^schg-[a-z0-9]{6,}$")),
    /**The settings key, as declared in settings/keys.json.*/
    key: z
      .string()
      .regex(new RegExp("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$"))
      .describe("The settings key, as declared in settings/keys.json."),
    /**Which layer was written. A person-scoped change names no person (rule 6a).*/
    scope: z
      .enum(["household", "person"])
      .describe(
        "Which layer was written. A person-scoped change names no person (rule 6a).",
      ),
    /**Only an owner or admin can write a listed key; a teen or child never produces a record.*/
    actor_role: z
      .enum(["owner", "admin"])
      .describe(
        "Only an owner or admin can write a listed key; a teen or child never produces a record.",
      ),
    /**The new value as written, any JSON.*/
    value: z.any().describe("The new value as written, any JSON."),
    /**The value before the write, when the hub had one; absent when the key had no stored value.*/
    previous: z
      .any()
      .describe(
        "The value before the write, when the hub had one; absent when the key had no stored value.",
      )
      .optional(),
    /**Whether the change gives a child or teen more reach (widens), less (narrows), or is not ordered (changes). Decided by the hub per key where an order is known.*/
    direction: z
      .enum(["widens", "narrows", "changes"])
      .describe(
        "Whether the change gives a child or teen more reach (widens), less (narrows), or is not ordered (changes). Decided by the hub per key where an order is known.",
      )
      .default("changes"),
    changed_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
  })
  .strict()
  .describe(
    "SETTINGS-AUDIT-01: one record of an owner or admin changing a safety-relevant setting (a key that widens or narrows what a child or teen can reach, or a role default or override under the content filter, Home RULES.md area 'Content filter and feature access'). Shown to owners and admins. Rule 6a: the record carries the actor's role, never a person id or name, and for a per-person key it says only that the scope was a person. The hub writes one per accepted write; a refused write leaves none.",
  );
export type SettingsChange = z.infer<typeof SettingsChange>;
