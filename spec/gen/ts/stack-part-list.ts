// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/stack-part-list.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Parts list response for the Stack API.*/
export const StackPartList = z
  .object({
    /**Audience receiving this list.*/
    audience: z
      .enum(["adult", "minor"])
      .describe("Audience receiving this list."),
    /**Part rows.*/
    parts: z
      .array(
        z
          .object({
            /**Opaque part key.*/
            id: z
              .string()
              .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
              .min(1)
              .describe("Opaque part key."),
            /**The installable part kind.*/
            kind: z
              .enum(["model", "tool", "engine"])
              .describe("The installable part kind."),
            /**Open category name.*/
            category: z.string().min(1).describe("Open category name."),
            /**Shipped order within the category.*/
            priority: z
              .number()
              .int()
              .gte(1)
              .describe("Shipped order within the category."),
            /**True name shown to adults.*/
            label: z.string().min(1).describe("True name shown to adults."),
            /**Plain one-line description.*/
            description: z
              .string()
              .min(0)
              .describe("Plain one-line description."),
            /**Whether this part is enabled.*/
            enabled: z.boolean().describe("Whether this part is enabled."),
            /**Current install state.*/
            state: z
              .enum([
                "ready",
                "missing",
                "installing",
                "updating",
                "failed",
                "unsupported",
              ])
              .describe("Current install state."),
            /**Installed size in bytes.*/
            size_bytes: z
              .number()
              .int()
              .gte(0)
              .describe("Installed size in bytes."),
            /**Download size in bytes.*/
            download_bytes: z
              .number()
              .int()
              .gte(0)
              .describe("Download size in bytes."),
            /**Current operation percent, if any.*/
            percent: z
              .union([z.number().gte(0).lte(100), z.null()])
              .describe("Current operation percent, if any."),
            fits: z
              .object({
                /**Fits standard tier.*/
                standard: z.boolean().describe("Fits standard tier."),
                /**Fits boost tier.*/
                boost: z.boolean().describe("Fits boost tier."),
                /**Fits max tier.*/
                max: z.boolean().describe("Fits max tier."),
                /**Reason it does not fit, if any.*/
                reason: z
                  .union([
                    z.string().describe("Reason it does not fit, if any."),
                    z.null().describe("Reason it does not fit, if any."),
                  ])
                  .describe("Reason it does not fit, if any."),
              })
              .strict(),
            /**Whether installation is available.*/
            can_install: z
              .boolean()
              .describe("Whether installation is available."),
            /**Why installation is blocked, if any.*/
            install_block: z
              .union([
                z.string().describe("Why installation is blocked, if any."),
                z.null().describe("Why installation is blocked, if any."),
              ])
              .describe("Why installation is blocked, if any."),
            /**Whether uninstall is available.*/
            can_uninstall: z
              .boolean()
              .describe("Whether uninstall is available."),
            /**Why uninstall is blocked, if any.*/
            uninstall_block: z
              .union([
                z.string().describe("Why uninstall is blocked, if any."),
                z.null().describe("Why uninstall is blocked, if any."),
              ])
              .describe("Why uninstall is blocked, if any."),
            /**Whether a license notice needs acknowledgment.*/
            licence_needed: z
              .boolean()
              .describe("Whether a license notice needs acknowledgment."),
            /**Part ids that require this part.*/
            required_by: z
              .array(
                z
                  .string()
                  .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
                  .min(1)
                  .describe("Opaque part key."),
              )
              .describe("Part ids that require this part."),
            update: z
              .object({
                /**Whether an update is available.*/
                available: z
                  .boolean()
                  .describe("Whether an update is available."),
                /**Available version, if any.*/
                version: z
                  .union([
                    z.string().describe("Available version, if any."),
                    z.null().describe("Available version, if any."),
                  ])
                  .describe("Available version, if any."),
              })
              .strict(),
          })
          .strict()
          .describe("One row returned by GET /stack/v1/parts."),
      )
      .describe("Part rows."),
  })
  .strict()
  .describe("Parts list response for the Stack API.");
export type StackPartList = z.infer<typeof StackPartList>;
