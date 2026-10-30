// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/tier-slot.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**TIER-SPEC-01 (Home docs/design/tier-families-and-options-2026-10-30.md section 2). The value of one `engines.<role>.tier.<reduced|standard|boost|max>` setting: which model fills the slot and the options it runs with. `model` is a catalog candidate id, `recommended` (follows catalog updates) or `off` (the slot is switched off; the model stays installed). `options` is typed per category by vocab/resource-tiers.json; a name that category does not declare is invalid. The slot never holds a draft model (a launch setting, not an option). `who` is the optional Who can use it choice, defaulting by tier from the same vocab.*/
export const TierSlot = z
  .object({
    /**`recommended`, `off`, or a catalog candidate id (model-capabilities.schema.json).*/
    model: z
      .string()
      .regex(new RegExp("^(recommended|off|[a-z][a-z0-9-]*)$"))
      .min(1)
      .describe(
        "`recommended`, `off`, or a catalog candidate id (model-capabilities.schema.json).",
      ),
    /**Option values by name. Names, types and ranges come from vocab/resource-tiers.json for the slot's category; the Stack and Home validate against it.*/
    options: z
      .record(z.string(), z.union([z.boolean(), z.number().int(), z.number()]))
      .describe(
        "Option values by name. Names, types and ranges come from vocab/resource-tiers.json for the slot's category; the Stack and Home validate against it.",
      ),
    /**Who can use the slot. Absent means the tier's default in vocab/resource-tiers.json. Nobody may widen Max past the `tier.max` grant.*/
    who: z
      .enum(["everyone", "assigned", "admins"])
      .describe(
        "Who can use the slot. Absent means the tier's default in vocab/resource-tiers.json. Nobody may widen Max past the `tier.max` grant.",
      )
      .optional(),
  })
  .strict()
  .describe(
    "TIER-SPEC-01 (Home docs/design/tier-families-and-options-2026-10-30.md section 2). The value of one `engines.<role>.tier.<reduced|standard|boost|max>` setting: which model fills the slot and the options it runs with. `model` is a catalog candidate id, `recommended` (follows catalog updates) or `off` (the slot is switched off; the model stays installed). `options` is typed per category by vocab/resource-tiers.json; a name that category does not declare is invalid. The slot never holds a draft model (a launch setting, not an option). `who` is the optional Who can use it choice, defaulting by tier from the same vocab.",
  );
export type TierSlot = z.infer<typeof TierSlot>;
