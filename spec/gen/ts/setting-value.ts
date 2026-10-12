// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/setting-value.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One row per (scope, key). Per-field last-writer-wins on the oplog via hlc. See platform plan 3.1, 3.2, and docs/SETTINGS.md in .github.*/
export const SettingValue = z
  .object({
    /**household (global defaults), band:<child|teen|adult> (user defaults), person:<id> (user overrides), or device:<id>.*/
    scope: z
      .string()
      .regex(
        new RegExp(
          "^(household|band:(child|teen|adult)|person:[a-z0-9-]+|device:[a-z0-9-]+)$",
        ),
      )
      .describe(
        "household (global defaults), band:<child|teen|adult> (user defaults), person:<id> (user overrides), or device:<id>.",
      ),
    /**Dotted, lowercase, owned by exactly one package (docs/PACKAGES.md naming rule). Must exist in the settings registry.*/
    key: z
      .string()
      .regex(new RegExp("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$"))
      .describe(
        "Dotted, lowercase, owned by exactly one package (docs/PACKAGES.md naming rule). Must exist in the settings registry.",
      ),
    /**Shape depends on the key's selector type in the settings registry; validated against that, not here.*/
    value: z
      .any()
      .describe(
        "Shape depends on the key's selector type in the settings registry; validated against that, not here.",
      ),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    /**Where this value last came from, for the settings UI's modified filter.*/
    source: z
      .enum(["user", "default", "package", "sync"])
      .describe(
        "Where this value last came from, for the settings UI's modified filter.",
      ),
    /**SETTINGS-LAYERS-01. Who wrote a user override: self (the person), system, or the id of the admin who set it. Only an admin id may be lifted by an admin alone. List keys keep this per entry in the value instead (settings-delta).*/
    set_by: z
      .string()
      .regex(new RegExp("^(self|system|[a-z0-9-]+)$"))
      .min(1)
      .describe(
        "SETTINGS-LAYERS-01. Who wrote a user override: self (the person), system, or the id of the admin who set it. Only an admin id may be lifted by an admin alone. List keys keep this per entry in the value instead (settings-delta).",
      )
      .optional(),
  })
  .strict()
  .describe(
    "One row per (scope, key). Per-field last-writer-wins on the oplog via hlc. See platform plan 3.1, 3.2, and docs/SETTINGS.md in .github.",
  );
export type SettingValue = z.infer<typeof SettingValue>;
