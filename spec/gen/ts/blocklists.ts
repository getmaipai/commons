// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/blocklists.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The blocked-site lists a household can sync, one row per list: its category, plain-words label, which age bands start with it on and which cannot turn it off. Pins (source, checksum, size) live in the signed catalog list index, never here. A list id the catalog index names that this file does not is ignored.*/
export const Blocklists = z
  .object({
    /**The review month of this policy, such as 2026.10.*/
    version: z
      .string()
      .min(1)
      .describe("The review month of this policy, such as 2026.10."),
    lists: z
      .array(
        z
          .object({
            id: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
            category: z.enum([
              "adult",
              "gambling",
              "drugs",
              "scam",
              "phishing",
              "malware",
            ]),
            label: z.string().min(1),
            /**One plain-words line, shown beside the list's name.*/
            does: z
              .string()
              .min(1)
              .describe("One plain-words line, shown beside the list's name."),
            /**Bands that start with this list on.*/
            default_for: z
              .array(z.enum(["child", "teen", "adult"]))
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe("Bands that start with this list on."),
            /**Bands that cannot turn this list off. Always on for them and never offered as an option.*/
            locked_for: z
              .array(z.enum(["child", "teen", "adult"]))
              .refine(
                (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                "All items must be unique!",
              )
              .describe(
                "Bands that cannot turn this list off. Always on for them and never offered as an option.",
              ),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .describe(
    "The blocked-site lists a household can sync, one row per list: its category, plain-words label, which age bands start with it on and which cannot turn it off. Pins (source, checksum, size) live in the signed catalog list index, never here. A list id the catalog index names that this file does not is ignored.",
  );
export type Blocklists = z.infer<typeof Blocklists>;
