// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/tour.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A short, package-declared guided tour. Cross-field child-copy and hero-slide existence checks are enforced by the spec tour validator; hero_slide lookup may also be performed by Home's validator when slide data is available.*/
export const Tour = z
  .object({
    id: z.string().min(1),
    version: z.number().int().gte(1),
    title: z.string().min(1).max(80),
    starts_on: z.string().min(1).optional(),
    audience: z
      .array(z.enum(["adult", "teen", "child"]))
      .min(1)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      ),
    steps: z
      .array(
        z
          .object({
            id: z.string().min(1).optional(),
            target: z.string().min(1).optional(),
            hero_slide: z.string().min(1).optional(),
            title: z
              .string()
              .regex(new RegExp("^[^—]*$"))
              .min(1)
              .max(40)
              .optional(),
            body: z
              .string()
              .regex(new RegExp("^[^—]*$"))
              .min(1)
              .max(140)
              .optional(),
            title_by_audience: z
              .object({
                teen: z
                  .string()
                  .regex(new RegExp("^[^—]*$"))
                  .min(1)
                  .max(140)
                  .optional(),
                child: z
                  .string()
                  .regex(new RegExp("^[^—]*$"))
                  .min(1)
                  .max(140)
                  .optional(),
              })
              .strict()
              .optional(),
            body_by_audience: z
              .object({
                teen: z
                  .string()
                  .regex(new RegExp("^[^—]*$"))
                  .min(1)
                  .max(140)
                  .optional(),
                child: z
                  .string()
                  .regex(new RegExp("^[^—]*$"))
                  .min(1)
                  .max(140)
                  .optional(),
              })
              .strict()
              .optional(),
            placement: z
              .enum(["top", "bottom", "left", "right", "auto", "center"])
              .optional(),
            order: z.number().int().gte(0).optional(),
            condition: z
              .object({
                roles: z
                  .array(
                    z.enum([
                      "owner",
                      "admin",
                      "adult",
                      "teen",
                      "child",
                      "guest",
                    ]),
                  )
                  .min(1)
                  .refine(
                    (arr) => arr.every((item, i) => arr.indexOf(item) == i),
                    "All items must be unique!",
                  )
                  .optional(),
                setting: z
                  .object({ key: z.string().min(1), value: z.any() })
                  .strict()
                  .optional(),
                capability: z.string().min(1).optional(),
                surface: z.enum(["desktop", "phone"]).optional(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(5),
  })
  .strict()
  .describe(
    "A short, package-declared guided tour. Cross-field child-copy and hero-slide existence checks are enforced by the spec tour validator; hero_slide lookup may also be performed by Home's validator when slide data is available.",
  );
export type Tour = z.infer<typeof Tour>;
