// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/settings-delta.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**SETTINGS-LAYERS-01. The value of a list key (merge: union) stored in a user-overrides row (person:<id>). It never copies the lists above it: it only adds entries and removes entries that a higher layer would otherwise give the person, so a later change to the global defaults or the user defaults still flows through. Every entry records who set it, so an entry an admin set can be lifted only by an admin.*/
export const SettingsDelta = z
  .object({
    add: z
      .array(
        z
          .object({
            /**A list id (blp-gambling) or a host (example.com).*/
            item: z
              .string()
              .min(1)
              .describe("A list id (blp-gambling) or a host (example.com)."),
            /**self (the person) or the id of the admin who set the entry.*/
            set_by: z
              .string()
              .regex(new RegExp("^(self|system|[a-z0-9-]+)$"))
              .describe(
                "self (the person) or the id of the admin who set the entry.",
              ),
            hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          })
          .strict(),
      )
      .default([]),
    remove: z
      .array(
        z
          .object({
            /**A list id (blp-gambling) or a host (example.com).*/
            item: z
              .string()
              .min(1)
              .describe("A list id (blp-gambling) or a host (example.com)."),
            /**self (the person) or the id of the admin who set the entry.*/
            set_by: z
              .string()
              .regex(new RegExp("^(self|system|[a-z0-9-]+)$"))
              .describe(
                "self (the person) or the id of the admin who set the entry.",
              ),
            hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
          })
          .strict(),
      )
      .default([]),
  })
  .strict()
  .describe(
    "SETTINGS-LAYERS-01. The value of a list key (merge: union) stored in a user-overrides row (person:<id>). It never copies the lists above it: it only adds entries and removes entries that a higher layer would otherwise give the person, so a later change to the global defaults or the user defaults still flows through. Every entry records who set it, so an entry an admin set can be lifted only by an admin.",
  );
export type SettingsDelta = z.infer<typeof SettingsDelta>;
