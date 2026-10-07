// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/settings-area.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One settings area: the title, sidebar groups, sections and cards of a settings screen (Chat settings, Account, Home settings, and later one per app). Central areas live in spec/settings/areas.json; a catalog package declares its own under contributes.settings_area. A card is one registry group (SettingsKey lives_in) at one scope, and each registry group sits in exactly one card, so every key has one home. An area only ever reads and writes the viewer's own person scope, the household scope (admins) and this device: no field here takes another person's id.*/
export const SettingsArea = z
  .object({
    /**Route segment: /settings/<id>/<section>. Unique. The nine ids in $defs.reservedIds are static legacy routes that already own those paths; areas-check.ts refuses them (a JSON Schema `not` would drop this pattern from the generated models).*/
    id: z
      .string()
      .regex(new RegExp("^[a-z][a-z0-9-]{0,31}$"))
      .describe(
        "Route segment: /settings/<id>/<section>. Unique. The nine ids in $defs.reservedIds are static legacy routes that already own those paths; areas-check.ts refuses them (a JSON Schema `not` would drop this pattern from the generated models).",
      ),
    /**The settings column's heading.*/
    title: z.string().min(1).max(40).describe("The settings column's heading."),
    /**The nav entry that owns this area, so the app's header gets a gear. Absent for Account and Home settings.*/
    app: z
      .string()
      .regex(new RegExp("^/[A-Za-z0-9/_-]*$"))
      .describe(
        "The nav entry that owns this area, so the app's header gets a gear. Absent for Account and Home settings.",
      )
      .optional(),
    /**Who sees the area at all.*/
    audience: z
      .object({
        /**The role ladder, most to least privileged. min_role is the lowest role that may see the thing.*/
        min_role: z
          .enum(["owner", "admin", "adult", "teen", "child", "guest"])
          .describe(
            "The role ladder, most to least privileged. min_role is the lowest role that may see the thing.",
          ),
      })
      .strict()
      .describe("Who sees the area at all."),
    /**Sidebar groups, in order. Every section is listed in exactly one.*/
    groups: z
      .array(
        z
          .object({
            label: z.string().min(1).max(40),
            sections: z.array(z.string()).min(1),
          })
          .strict(),
      )
      .min(1)
      .describe(
        "Sidebar groups, in order. Every section is listed in exactly one.",
      ),
    sections: z
      .array(
        z
          .object({
            /**Unique within its area.*/
            id: z
              .string()
              .regex(new RegExp("^[a-z][a-z0-9-]{0,31}$"))
              .describe("Unique within its area."),
            label: z.string().min(1).max(40),
            icon: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
            /**keys draws cards; view draws one named Home view; link draws an arrow row that navigates.*/
            kind: z
              .enum(["keys", "view", "link"])
              .describe(
                "keys draws cards; view draws one named Home view; link draws an arrow row that navigates.",
              ),
            cards: z
              .array(
                z
                  .object({
                    /**The card's heading; the one place a group's title is written.*/
                    label: z
                      .string()
                      .min(1)
                      .max(60)
                      .describe(
                        "The card's heading; the one place a group's title is written.",
                      ),
                    /**A registry group: SettingsKey lives_in.*/
                    group: z
                      .string()
                      .min(1)
                      .describe("A registry group: SettingsKey lives_in.")
                      .optional(),
                    scope: z.enum(["household", "person", "device"]).optional(),
                    /**Which key levels this card draws. Absent means basic and advanced. Expert keys are drawn only by a card in a section with id developer, whose levels are exactly [expert].*/
                    levels: z
                      .array(z.enum(["basic", "advanced", "expert"]))
                      .min(1)
                      .refine(
                        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                        "All items must be unique!",
                      )
                      .describe(
                        "Which key levels this card draws. Absent means basic and advanced. Expert keys are drawn only by a card in a section with id developer, whose levels are exactly [expert].",
                      )
                      .optional(),
                    /**A card of link rows to existing pages instead of keys.*/
                    links: z
                      .array(
                        z
                          .object({
                            label: z.string().min(1).max(60),
                            /**An in-app path. {self} is the only placeholder, resolved on the client to the viewer's own id; no other person id can appear.*/
                            href: z
                              .string()
                              .regex(new RegExp("^/([^{}]|\\{self\\})*$"))
                              .describe(
                                "An in-app path. {self} is the only placeholder, resolved on the client to the viewer's own id; no other person id can appear.",
                              ),
                            icon: z
                              .string()
                              .regex(new RegExp("^[a-z][a-z0-9-]*$"))
                              .optional(),
                            /**The role ladder, most to least privileged. min_role is the lowest role that may see the thing.*/
                            min_role: z
                              .enum([
                                "owner",
                                "admin",
                                "adult",
                                "teen",
                                "child",
                                "guest",
                              ])
                              .describe(
                                "The role ladder, most to least privileged. min_role is the lowest role that may see the thing.",
                              )
                              .optional(),
                          })
                          .strict(),
                      )
                      .min(1)
                      .describe(
                        "A card of link rows to existing pages instead of keys.",
                      )
                      .optional(),
                    collapsed: z.boolean().default(false),
                    order: z.number().int().optional(),
                    /**The role ladder, most to least privileged. min_role is the lowest role that may see the thing.*/
                    min_role: z
                      .enum([
                        "owner",
                        "admin",
                        "adult",
                        "teen",
                        "child",
                        "guest",
                      ])
                      .describe(
                        "The role ladder, most to least privileged. min_role is the lowest role that may see the thing.",
                      )
                      .optional(),
                    bands: z
                      .array(z.enum(["child", "teen", "adult"]))
                      .min(1)
                      .refine(
                        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                        "All items must be unique!",
                      )
                      .optional(),
                    needs: z
                      .array(z.string().min(1))
                      .refine(
                        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                        "All items must be unique!",
                      )
                      .optional(),
                  })
                  .strict()
                  .describe(
                    "One card: either a registry group at one scope (group and scope together) or a list of link rows (links), never both. areas-check.ts enforces the pairing.",
                  ),
              )
              .min(1)
              .optional(),
            /**keys only: a view drawn above the cards.*/
            lead_view: z
              .enum([
                "account.profile",
                "account.voice",
                "account.device_appearance",
                "chat.skills",
                "chat.shortcuts",
                "home.commands",
                "home.voice_catalog",
              ])
              .describe("keys only: a view drawn above the cards.")
              .optional(),
            /**keys only: a view drawn below the cards.*/
            trail_view: z
              .enum([
                "account.profile",
                "account.voice",
                "account.device_appearance",
                "chat.skills",
                "chat.shortcuts",
                "home.commands",
                "home.voice_catalog",
              ])
              .describe("keys only: a view drawn below the cards.")
              .optional(),
            /**A named view in Home's view table. The list is closed so a package cannot name one Home does not have.*/
            view: z
              .enum([
                "account.profile",
                "account.voice",
                "account.device_appearance",
                "chat.skills",
                "chat.shortcuts",
                "home.commands",
                "home.voice_catalog",
              ])
              .describe(
                "A named view in Home's view table. The list is closed so a package cannot name one Home does not have.",
              )
              .optional(),
            /**An in-app path. {self} is the only placeholder, resolved on the client to the viewer's own id; no other person id can appear.*/
            href: z
              .string()
              .regex(new RegExp("^/([^{}]|\\{self\\})*$"))
              .describe(
                "An in-app path. {self} is the only placeholder, resolved on the client to the viewer's own id; no other person id can appear.",
              )
              .optional(),
            /**Extra words the area's own search matches.*/
            keywords: z
              .array(z.string().min(1))
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe("Extra words the area's own search matches.")
              .optional(),
            order: z.number().int().optional(),
            /**The role ladder, most to least privileged. min_role is the lowest role that may see the thing.*/
            min_role: z
              .enum(["owner", "admin", "adult", "teen", "child", "guest"])
              .describe(
                "The role ladder, most to least privileged. min_role is the lowest role that may see the thing.",
              )
              .optional(),
            bands: z
              .array(z.enum(["child", "teen", "adult"]))
              .min(1)
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .optional(),
            needs: z
              .array(z.string().min(1))
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .optional(),
          })
          .strict()
          .and(z.intersection(z.any(), z.intersection(z.any(), z.any())))
          .describe(
            "One section. kind keys needs cards, view needs a view, link needs an href. areas-check.ts refuses fields that belong to another kind.",
          ),
      )
      .min(1),
  })
  .strict()
  .describe(
    "One settings area: the title, sidebar groups, sections and cards of a settings screen (Chat settings, Account, Home settings, and later one per app). Central areas live in spec/settings/areas.json; a catalog package declares its own under contributes.settings_area. A card is one registry group (SettingsKey lives_in) at one scope, and each registry group sits in exactly one card, so every key has one home. An area only ever reads and writes the viewer's own person scope, the household scope (admins) and this device: no field here takes another person's id.",
  );
export type SettingsArea = z.infer<typeof SettingsArea>;
