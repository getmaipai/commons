// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/stack-part.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Catalog data for one installable model, tool, or engine.*/
export const StackPart = z
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
    /**Name served to a child or teen.*/
    neutral_label: z
      .string()
      .min(1)
      .describe("Name served to a child or teen."),
    /**Plain one-line description.*/
    description: z.string().min(1).describe("Plain one-line description."),
    /**Whether this part is only available to adults.*/
    adult_only: z
      .boolean()
      .describe("Whether this part is only available to adults."),
    /**Part version.*/
    version: z.string().min(1).describe("Part version."),
    /**Files that make up the installable part.*/
    files: z
      .array(
        z
          .object({
            /**HTTPS download URL.*/
            url: z
              .string()
              .url()
              .regex(new RegExp("^https://"))
              .describe("HTTPS download URL."),
            /**Lowercase SHA-256 digest.*/
            sha256: z
              .string()
              .regex(new RegExp("^[a-f0-9]{64}$"))
              .describe("Lowercase SHA-256 digest."),
            /**File size in bytes.*/
            bytes: z.number().int().gte(0).describe("File size in bytes."),
            /**Optional install path.*/
            path: z
              .string()
              .min(1)
              .describe("Optional install path.")
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .describe("Files that make up the installable part."),
    /**License name and notice reference.*/
    licence: z
      .object({
        /**License name.*/
        name: z.string().min(1).describe("License name."),
        /**Notice identifier, if any.*/
        notice_id: z
          .union([
            z.string().describe("Notice identifier, if any."),
            z.null().describe("Notice identifier, if any."),
          ])
          .describe("Notice identifier, if any."),
      })
      .strict()
      .describe("License name and notice reference."),
    /**Engine part id that runs this part, or null for an engine.*/
    runner: z
      .union([
        z
          .string()
          .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
          .min(1)
          .describe("Opaque part key."),
        z.null(),
      ])
      .describe("Engine part id that runs this part, or null for an engine."),
    /**Required part ids.*/
    requires: z
      .array(
        z
          .string()
          .regex(new RegExp("^[a-z0-9][a-z0-9._-]*$"))
          .min(1)
          .describe("Opaque part key."),
      )
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe("Required part ids."),
    /**Available tiered builds.*/
    builds: z
      .array(
        z
          .object({
            /**Build tier.*/
            tier: z.enum(["standard", "boost", "max"]).describe("Build tier."),
            options: z.object({}).catchall(z.any()),
          })
          .strict(),
      )
      .describe("Available tiered builds.")
      .optional(),
    /**Memory peak measurements.*/
    peaks: z
      .array(
        z
          .object({
            options: z.object({}).catchall(z.any()),
            /**Peak memory in bytes.*/
            bytes: z.number().int().gte(0).describe("Peak memory in bytes."),
            /**Measurement status.*/
            status: z
              .enum(["measured", "unverified"])
              .describe("Measurement status."),
            /**Measurement date or note.*/
            measured_on: z
              .string()
              .min(1)
              .describe("Measurement date or note.")
              .optional(),
          })
          .strict(),
      )
      .describe("Memory peak measurements."),
    /**Minimum compatible Stack version.*/
    min_stack: z.string().min(1).describe("Minimum compatible Stack version."),
  })
  .strict()
  .describe("Catalog data for one installable model, tool, or engine.");
export type StackPart = z.infer<typeof StackPart>;
