// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/settings-key.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One entry in the settings registry (spec/settings/keys.json) or a package manifest's config[]. See platform plan 3.2 and .github's docs/SETTINGS.md.*/
export const SettingsKey = z
  .object({
    key: z.string().regex(new RegExp("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$")),
    scope: z.enum(["household", "person", "device"]),
    /**Home Assistant's selector names (3.2).*/
    selector: z
      .enum([
        "number",
        "select",
        "text",
        "boolean",
        "duration",
        "time",
        "entity",
        "area",
        "person",
        "media",
        "location",
      ])
      .describe("Home Assistant's selector names (3.2)."),
    /**Selector-specific: min/max for number, a duration unit, an option list for select, and so on. Shape depends on selector.*/
    range: z
      .object({
        options: z.array(z.string()).optional(),
        options_from: z.string().min(1).optional(),
        multiple: z.boolean().optional(),
        allow_current: z.boolean().optional(),
      })
      .catchall(z.any())
      .describe(
        "Selector-specific: min/max for number, a duration unit, an option list for select, and so on. Shape depends on selector.",
      )
      .optional(),
    /**SETTINGS-LAYERS-01. The scopes a row of this key may be stored at, lowest to highest precedence: band = user defaults (Kids, Teens, Adults), household = global defaults, person = user overrides. Absent means the key is stored at its own scope only and nothing is layered.*/
    layers: z
      .array(z.enum(["band", "household", "person"]))
      .min(1)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "SETTINGS-LAYERS-01. The scopes a row of this key may be stored at, lowest to highest precedence: band = user defaults (Kids, Teens, Adults), household = global defaults, person = user overrides. Absent means the key is stored at its own scope only and nothing is layered.",
      )
      .optional(),
    /**How layers combine. override: the most specific layer that has a value wins. union: a list key; each layer adds entries and a more specific layer may remove an entry it can see, and each entry carries who set it (spec/schemas/settings-delta.schema.json). Absent means override.*/
    merge: z
      .enum(["override", "union"])
      .describe(
        "How layers combine. override: the most specific layer that has a value wins. union: a list key; each layer adds entries and a more specific layer may remove an entry it can see, and each entry carries who set it (spec/schemas/settings-delta.schema.json). Absent means override.",
      )
      .optional(),
    /**EASE-OF-USE-01. Absent means false. True means a person may change their own value at any age, including a child, unless an admin has locked the key for them. Declared once here for the write gate. Only comfort keys (ease.*) carry it; a safety, consent, privacy or credentials key never does (a spec test holds that).*/
    self_service: z
      .boolean()
      .describe(
        "EASE-OF-USE-01. Absent means false. True means a person may change their own value at any age, including a child, unless an admin has locked the key for them. Declared once here for the write gate. Only comfort keys (ease.*) carry it; a safety, consent, privacy or credentials key never does (a spec test holds that).",
      )
      .optional(),
    /**Transitional. Where the user defaults for each audience are stored today, as band-named household keys, until they move to band:<name> rows. Each named key must exist.*/
    user_defaults_keys: z
      .object({
        child: z
          .string()
          .regex(new RegExp("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$"))
          .optional(),
        teen: z
          .string()
          .regex(new RegExp("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$"))
          .optional(),
        adult: z
          .string()
          .regex(new RegExp("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$"))
          .optional(),
      })
      .strict()
      .describe(
        "Transitional. Where the user defaults for each audience are stored today, as band-named household keys, until they move to band:<name> rows. Each named key must exist.",
      )
      .optional(),
    default: z.any(),
    label: z.string().min(1),
    help: z.string().optional(),
    /**Confirmation shown before a boolean setting is turned off.*/
    confirm_off: z
      .object({
        title: z.string().min(1),
        body: z.string().min(1),
        action: z.string().min(1),
      })
      .strict()
      .optional(),
    copy: z
      .object({
        does: z.string().min(1),
        does_child: z.string().min(1).optional(),
        does_teen: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
        what_is_stored: z.string().min(1).optional(),
        consent_adult_self: z.string().min(1).optional(),
        consent_teen_self: z.string().min(1).optional(),
        consent_child_parent: z.string().min(1).optional(),
        consent_guest: z.string().min(1).optional(),
        options: z.record(z.string(), z.string().min(1)).optional(),
        /**Display name for each option of a select, when the raw token is not a readable name (searxng -> SearXNG).*/
        option_labels: z
          .record(z.string(), z.string().min(1))
          .describe(
            "Display name for each option of a select, when the raw token is not a readable name (searxng -> SearXNG).",
          )
          .optional(),
      })
      .strict()
      .optional(),
    control: z
      .object({
        child: z.enum(["self", "guardian"]),
        teen: z.enum(["self", "guardian"]),
        adult: z.enum(["self", "guardian"]),
      })
      .strict()
      .optional(),
    band_default: z
      .object({ child: z.any(), teen: z.any(), adult: z.any() })
      .strict()
      .optional(),
    section: z
      .object({
        id: z.string().optional(),
        collapsed: z.boolean().default(false),
        order: z.number().int().optional(),
      })
      .strict()
      .optional(),
    level: z.enum(["basic", "advanced", "expert"]),
    secret: z.boolean().default(false),
    /**Capabilities required for this key to apply.*/
    needs: z
      .array(z.string())
      .describe("Capabilities required for this key to apply.")
      .optional(),
    /**The package, companion, integration, or central page id that renders this key.*/
    lives_in: z
      .string()
      .describe(
        "The package, companion, integration, or central page id that renders this key.",
      ),
    honoured_by: z.array(z.enum(["home", "bot"])).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.confirm_off !== undefined && value.selector !== "boolean") {
      ctx.addIssue({ code: "custom", message: "confirm_off is allowed only for boolean selectors", path: ["confirm_off"] });
    }
  })
  .describe(
    "One entry in the settings registry (spec/settings/keys.json) or a package manifest's config[]. See platform plan 3.2 and .github's docs/SETTINGS.md.",
  );
export type SettingsKey = z.infer<typeof SettingsKey>;
