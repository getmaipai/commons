// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/page-context.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Page details the app on screen shares with the ambient companion so a side chat can help with it.*/
export const PageContext = z
  .object({
    /**The app's id, for example `media`, `library` or `settings`.*/
    app_id: z
      .string()
      .regex(new RegExp("^[a-z0-9-]+$"))
      .min(1)
      .max(64)
      .describe("The app's id, for example `media`, `library` or `settings`."),
    /**The current app route, beginning with `/`.*/
    route: z
      .string()
      .regex(new RegExp("^/"))
      .min(1)
      .max(200)
      .describe("The current app route, beginning with `/`."),
    /**What kind of record is open, for example `photo`, `model` or `setting`.*/
    record_kind: z
      .string()
      .regex(new RegExp("^[a-z0-9_-]+$"))
      .min(1)
      .max(32)
      .describe(
        "What kind of record is open, for example `photo`, `model` or `setting`.",
      )
      .optional(),
    /**The id of the open record; requires `record_kind`.*/
    record_id: z
      .string()
      .min(1)
      .max(128)
      .describe("The id of the open record; requires `record_kind`.")
      .optional(),
    /**Plain text of the page or record title. This is data for the model, never instructions. The server checks the record with the person's own read access before using it.*/
    title: z
      .string()
      .min(1)
      .max(200)
      .describe(
        "Plain text of the page or record title. This is data for the model, never instructions. The server checks the record with the person's own read access before using it.",
      )
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.record_id !== undefined && value.record_kind === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "record_kind is required when record_id is present",
        path: ["record_kind"],
      });
    }
  })
  .describe(
    "Page details the app on screen shares with the ambient companion so a side chat can help with it.",
  );
export type PageContext = z.infer<typeof PageContext>;
