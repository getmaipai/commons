// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/settings-areas.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The central settings areas and cards shown on a device's own settings dialog.*/
export const SettingsAreas = z
  .object({
    areas: z.array(
      z
        .object({
          /**Route segment: /settings/<id>/<section>. Unique. The nine ids in $defs.reservedIds are static legacy routes that already own those paths; areas-check.ts refuses them (a JSON Schema `not` would drop this pattern from the generated models).*/
          id: z
            .string()
            .regex(new RegExp("^[a-z][a-z0-9-]{0,31}$"))
            .describe(
              "Route segment: /settings/<id>/<section>. Unique. The nine ids in $defs.reservedIds are static legacy routes that already own those paths; areas-check.ts refuses them (a JSON Schema `not` would drop this pattern from the generated models).",
            ),
          /**The settings column's heading.*/
          title: z
            .string()
            .min(1)
            .max(40)
            .describe("The settings column's heading."),
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
                          /**The section tab that contains this card. Omitted cards appear in the summary strip above the tabs.*/
                          tab: z
                            .string()
                            .regex(new RegExp("^[a-z][a-z0-9-]*$"))
                            .describe(
                              "The section tab that contains this card. Omitted cards appear in the summary strip above the tabs.",
                            )
                            .optional(),
                          scope: z
                            .enum(["household", "person", "device"])
                            .optional(),
                          /**Which key levels this card draws. Absent means basic and advanced. Expert keys are drawn only by a card in a section with id developer, whose levels are exactly [expert].*/
                          levels: z
                            .array(z.enum(["basic", "advanced", "expert"]))
                            .min(1)
                            .refine(
                              (arr) =>
                                arr.every((item, i) => arr.indexOf(item) == i),
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
                          /**A view that is this card's body, drawn in place of the group's default rows. With a group and scope the view draws that group's keys; without them it draws no keys.*/
                          view: z
                            .enum([
                              "account.profile",
                              "account.voice",
                              "account.likeness",
                              "account.device_appearance",
                              "chat.skills",
                              "chat.shortcuts",
                              "home.commands",
                              "home.voice_catalog",
                              "home.engine_admin",
                              "home.devices_admin",
                              "home.routing_stats",
                              "home.reference_library",
                              "home.pictures_library",
                              "home.media_library",
                              "account.coding_keys",
                              "ai.job_choices",
                              "ai.always_on",
                            ])
                            .describe(
                              "A view that is this card's body, drawn in place of the group's default rows. With a group and scope the view draws that group's keys; without them it draws no keys.",
                            )
                            .optional(),
                          /**One plain sentence under the card heading, for a view card. The one place that sentence is written.*/
                          description: z
                            .string()
                            .min(1)
                            .max(160)
                            .describe(
                              "One plain sentence under the card heading, for a view card. The one place that sentence is written.",
                            )
                            .optional(),
                          /**A view card's choices that set no setting (a switch that installs or removes a part): the one place their label and description are written.*/
                          choices: z
                            .array(
                              z
                                .object({
                                  id: z
                                    .string()
                                    .regex(new RegExp("^[a-z][a-z0-9_-]*$")),
                                  label: z.string().min(1).max(60),
                                  description: z.string().min(1).max(160),
                                })
                                .strict(),
                            )
                            .min(1)
                            .describe(
                              "A view card's choices that set no setting (a switch that installs or removes a part): the one place their label and description are written.",
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
                              (arr) =>
                                arr.every((item, i) => arr.indexOf(item) == i),
                              "All items must be unique!",
                            )
                            .optional(),
                          needs: z
                            .array(z.string().min(1))
                            .refine(
                              (arr) =>
                                arr.every((item, i) => arr.indexOf(item) == i),
                              "All items must be unique!",
                            )
                            .optional(),
                          /**Draw the card's list-choice keys as one checkbox grid: a row per list, a column per user type. The rows come from the named policy file (one definition); each column is the existing multi-select key for that user type, so the grid reads and writes the same values and keeps no second store. Those keys are hidden from the card's ordinary rows (each key is drawn once). The card's other keys still draw as rows under the grid.*/
                          matrix: z
                            .object({
                              /**The policy file the rows come from (spec/search/blocklists.json or spec/news/feed-lists.json). A list in its locked_for for a column's band shows checked and disabled. A list whose offered_for leaves a column's band out shows unchecked and disabled, with the unavailable_note.*/
                              rows: z
                                .enum(["search/blocklists", "news/feed-lists"])
                                .describe(
                                  "The policy file the rows come from (spec/search/blocklists.json or spec/news/feed-lists.json). A list in its locked_for for a column's band shows checked and disabled. A list whose offered_for leaves a column's band out shows unchecked and disabled, with the unavailable_note.",
                                ),
                              /**The heading over the row labels. Omitted, the renderer says Kind of site.*/
                              rows_label: z
                                .string()
                                .min(1)
                                .max(40)
                                .describe(
                                  "The heading over the row labels. Omitted, the renderer says Kind of site.",
                                )
                                .optional(),
                              columns: z
                                .array(
                                  z
                                    .object({
                                      label: z.string().min(1).max(20),
                                      /**A select key with range.multiple in this card's group and scope.*/
                                      key: z
                                        .string()
                                        .min(1)
                                        .describe(
                                          "A select key with range.multiple in this card's group and scope.",
                                        ),
                                      band: z.enum(["child", "teen", "adult"]),
                                    })
                                    .strict(),
                                )
                                .min(1)
                                .max(3),
                              /**The plain reason shown under the grid when any cell is locked.*/
                              locked_note: z
                                .string()
                                .min(1)
                                .describe(
                                  "The plain reason shown under the grid when any cell is locked.",
                                )
                                .optional(),
                              /**The plain reason shown under the grid when a list is not offered to a column's user type.*/
                              unavailable_note: z
                                .string()
                                .min(1)
                                .describe(
                                  "The plain reason shown under the grid when a list is not offered to a column's user type.",
                                )
                                .optional(),
                              /**What the person sees when a tick does not save: what happened and what to do.*/
                              save_error: z
                                .string()
                                .min(1)
                                .describe(
                                  "What the person sees when a tick does not save: what happened and what to do.",
                                )
                                .optional(),
                            })
                            .strict()
                            .describe(
                              "Draw the card's list-choice keys as one checkbox grid: a row per list, a column per user type. The rows come from the named policy file (one definition); each column is the existing multi-select key for that user type, so the grid reads and writes the same values and keeps no second store. Those keys are hidden from the card's ordinary rows (each key is drawn once). The card's other keys still draw as rows under the grid.",
                            )
                            .optional(),
                        })
                        .strict()
                        .describe(
                          "One card: either a registry group at one scope (group and scope together) or a list of link rows (links), or a view (view), never links with the others. areas-check.ts enforces the pairing.",
                        ),
                    )
                    .min(1)
                    .optional(),
                  /**keys only: a view drawn above the cards.*/
                  lead_view: z
                    .enum([
                      "account.profile",
                      "account.voice",
                      "account.likeness",
                      "account.device_appearance",
                      "chat.skills",
                      "chat.shortcuts",
                      "home.commands",
                      "home.voice_catalog",
                      "home.engine_admin",
                      "home.devices_admin",
                      "home.routing_stats",
                      "home.reference_library",
                      "home.pictures_library",
                      "home.media_library",
                      "account.coding_keys",
                      "ai.job_choices",
                      "ai.always_on",
                    ])
                    .describe("keys only: a view drawn above the cards.")
                    .optional(),
                  /**keys only: a view drawn below the cards.*/
                  trail_view: z
                    .enum([
                      "account.profile",
                      "account.voice",
                      "account.likeness",
                      "account.device_appearance",
                      "chat.skills",
                      "chat.shortcuts",
                      "home.commands",
                      "home.voice_catalog",
                      "home.engine_admin",
                      "home.devices_admin",
                      "home.routing_stats",
                      "home.reference_library",
                      "home.pictures_library",
                      "home.media_library",
                      "account.coding_keys",
                      "ai.job_choices",
                      "ai.always_on",
                    ])
                    .describe("keys only: a view drawn below the cards.")
                    .optional(),
                  /**A named view in Home's view table. The list is closed so a package cannot name one Home does not have.*/
                  view: z
                    .enum([
                      "account.profile",
                      "account.voice",
                      "account.likeness",
                      "account.device_appearance",
                      "chat.skills",
                      "chat.shortcuts",
                      "home.commands",
                      "home.voice_catalog",
                      "home.engine_admin",
                      "home.devices_admin",
                      "home.routing_stats",
                      "home.reference_library",
                      "home.pictures_library",
                      "home.media_library",
                      "account.coding_keys",
                      "ai.job_choices",
                      "ai.always_on",
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
                  /**Subtopics in declaration order; the shell persists the open tab in ?tab=.*/
                  tabs: z
                    .array(
                      z
                        .object({
                          id: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
                          label: z.string().min(1).max(40),
                          /**A named view drawn after this tab’s cards.*/
                          view: z
                            .enum([
                              "account.profile",
                              "account.voice",
                              "account.likeness",
                              "account.device_appearance",
                              "chat.skills",
                              "chat.shortcuts",
                              "home.commands",
                              "home.voice_catalog",
                              "home.engine_admin",
                              "home.devices_admin",
                              "home.routing_stats",
                              "home.reference_library",
                              "home.pictures_library",
                              "home.media_library",
                              "account.coding_keys",
                              "ai.job_choices",
                              "ai.always_on",
                            ])
                            .describe(
                              "A named view drawn after this tab’s cards.",
                            )
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
                          bands: z
                            .array(z.enum(["child", "teen", "adult"]))
                            .min(1)
                            .refine(
                              (arr) =>
                                arr.every((item, i) => arr.indexOf(item) == i),
                              "All items must be unique!",
                            )
                            .optional(),
                          needs: z
                            .array(z.string().min(1))
                            .refine(
                              (arr) =>
                                arr.every((item, i) => arr.indexOf(item) == i),
                              "All items must be unique!",
                            )
                            .optional(),
                        })
                        .strict()
                        .describe(
                          "A settings page tab with optional view and audience constraints.",
                        ),
                    )
                    .min(1)
                    .max(5)
                    .describe(
                      "Subtopics in declaration order; the shell persists the open tab in ?tab=.",
                    )
                    .optional(),
                  /**Tab id for a section view, lead_view or trail_view.*/
                  view_tab: z
                    .string()
                    .regex(new RegExp("^[a-z][a-z0-9-]*$"))
                    .describe(
                      "Tab id for a section view, lead_view or trail_view.",
                    )
                    .optional(),
                  /**A record detail screen at /settings/<area>/<section>/<id>; it is not an additional page.*/
                  detail: z
                    .object({
                      param: z.string().regex(new RegExp("^[a-z][a-z0-9_]*$")),
                      /**A named view in Home's view table. The list is closed so a package cannot name one Home does not have.*/
                      view: z
                        .enum([
                          "account.profile",
                          "account.voice",
                          "account.likeness",
                          "account.device_appearance",
                          "chat.skills",
                          "chat.shortcuts",
                          "home.commands",
                          "home.voice_catalog",
                          "home.engine_admin",
                          "home.devices_admin",
                          "home.routing_stats",
                          "home.reference_library",
                          "home.pictures_library",
                          "home.media_library",
                          "account.coding_keys",
                          "ai.job_choices",
                          "ai.always_on",
                        ])
                        .describe(
                          "A named view in Home's view table. The list is closed so a package cannot name one Home does not have.",
                        ),
                      tabs: z
                        .array(
                          z
                            .object({
                              id: z
                                .string()
                                .regex(new RegExp("^[a-z][a-z0-9-]*$")),
                              label: z.string().min(1).max(40),
                              /**A named view drawn after this tab’s cards.*/
                              view: z
                                .enum([
                                  "account.profile",
                                  "account.voice",
                                  "account.likeness",
                                  "account.device_appearance",
                                  "chat.skills",
                                  "chat.shortcuts",
                                  "home.commands",
                                  "home.voice_catalog",
                                  "home.engine_admin",
                                  "home.devices_admin",
                                  "home.routing_stats",
                                  "home.reference_library",
                                  "home.pictures_library",
                                  "home.media_library",
                                  "account.coding_keys",
                                  "ai.job_choices",
                                  "ai.always_on",
                                ])
                                .describe(
                                  "A named view drawn after this tab’s cards.",
                                )
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
                              bands: z
                                .array(z.enum(["child", "teen", "adult"]))
                                .min(1)
                                .refine(
                                  (arr) =>
                                    arr.every(
                                      (item, i) => arr.indexOf(item) == i,
                                    ),
                                  "All items must be unique!",
                                )
                                .optional(),
                              needs: z
                                .array(z.string().min(1))
                                .refine(
                                  (arr) =>
                                    arr.every(
                                      (item, i) => arr.indexOf(item) == i,
                                    ),
                                  "All items must be unique!",
                                )
                                .optional(),
                            })
                            .strict()
                            .describe(
                              "A settings page tab with optional view and audience constraints.",
                            ),
                        )
                        .min(2)
                        .max(5)
                        .optional(),
                    })
                    .strict()
                    .describe(
                      "A record detail screen at /settings/<area>/<section>/<id>; it is not an additional page.",
                    )
                    .optional(),
                  /**Whether the page edits the viewer’s own settings or household settings.*/
                  scope: z
                    .enum(["person", "household"])
                    .describe(
                      "Whether the page edits the viewer’s own settings or household settings.",
                    )
                    .optional(),
                })
                .strict()
                .and(
                  z.intersection(
                    z.intersection(z.any(), z.any()),
                    z.intersection(z.any(), z.any()),
                  ),
                )
                .describe(
                  "One section. kind keys needs cards, view needs a view, link needs an href. areas-check.ts refuses fields that belong to another kind.",
                ),
            )
            .min(1),
        })
        .strict()
        .describe(
          "One settings area: the title, sidebar groups, sections and cards of a settings screen (Settings, and later one per app). Central areas live in spec/settings/areas.json; a catalog package declares its own under contributes.settings_area. A card is one registry group (SettingsKey lives_in) at one scope, and each registry group sits in exactly one card, so every key has one home. An area only ever reads and writes the viewer's own person scope, the household scope (admins) and this device: no field here takes another person's id.",
        ),
    ),
    not_placed: z.array(
      z
        .object({
          scope: z.enum(["household", "person", "device"]),
          group: z.string().min(1),
          reason: z.string().min(10),
        })
        .strict(),
    ),
    /**Drawn on one device's own settings dialog, for the device the admin opened.*/
    device_cards: z
      .array(
        z
          .object({
            device_kind: z.literal("robot"),
            label: z.string().min(1).max(60),
            group: z.string().min(1),
            scope: z.literal("device"),
            /**The role ladder, most to least privileged. min_role is the lowest role that may see the thing.*/
            min_role: z
              .enum(["owner", "admin", "adult", "teen", "child", "guest"])
              .describe(
                "The role ladder, most to least privileged. min_role is the lowest role that may see the thing.",
              ),
          })
          .strict(),
      )
      .describe(
        "Drawn on one device's own settings dialog, for the device the admin opened.",
      ),
  })
  .strict()
  .describe(
    "The central settings areas and cards shown on a device's own settings dialog.",
  );
export type SettingsAreas = z.infer<typeof SettingsAreas>;
