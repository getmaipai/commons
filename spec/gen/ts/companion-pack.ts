// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/companion-pack.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**PACK-01: a portable animation and expression pack for one companion.*/
export const CompanionPack = z
  .object({
    version: z.literal(1),
    id: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
    name: z.string().min(1),
    tile: z
      .object({
        desktop: z.literal(480).optional(),
        phone: z.literal(320).optional(),
      })
      .strict(),
    states: z
      .object({
        idle: z
          .array(
            z
              .object({
                id: z.string().min(1),
                file: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.mp4$"),
                  ),
                fps: z.number().gt(0),
                frames: z.number().int().gte(1),
                "x-frames-positive": z.any().optional(),
                rest: z
                  .object({
                    first: z.number().int().gte(0),
                    last: z.number().int().gte(0),
                  })
                  .strict(),
                track: z.array(z.number()).min(1),
                encoding: z.literal("stacked-alpha-h264"),
                weight: z.number().gte(0).optional(),
              })
              .strict(),
          )
          .min(2)
          .max(8),
        listen: z
          .array(
            z
              .object({
                id: z.string().min(1),
                file: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.mp4$"),
                  ),
                fps: z.number().gt(0),
                frames: z.number().int().gte(1),
                "x-frames-positive": z.any().optional(),
                rest: z
                  .object({
                    first: z.number().int().gte(0),
                    last: z.number().int().gte(0),
                  })
                  .strict(),
                track: z.array(z.number()).min(1),
                encoding: z.literal("stacked-alpha-h264"),
                weight: z.number().gte(0).optional(),
              })
              .strict(),
          )
          .min(1)
          .max(8),
        think: z
          .array(
            z
              .object({
                id: z.string().min(1),
                file: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.mp4$"),
                  ),
                fps: z.number().gt(0),
                frames: z.number().int().gte(1),
                "x-frames-positive": z.any().optional(),
                rest: z
                  .object({
                    first: z.number().int().gte(0),
                    last: z.number().int().gte(0),
                  })
                  .strict(),
                track: z.array(z.number()).min(1),
                encoding: z.literal("stacked-alpha-h264"),
                weight: z.number().gte(0).optional(),
              })
              .strict(),
          )
          .min(1)
          .max(8),
        speak: z
          .array(
            z
              .object({
                id: z.string().min(1),
                file: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.mp4$"),
                  ),
                fps: z.number().gt(0),
                frames: z.number().int().gte(1),
                "x-frames-positive": z.any().optional(),
                rest: z
                  .object({
                    first: z.number().int().gte(0),
                    last: z.number().int().gte(0),
                  })
                  .strict(),
                track: z.array(z.number()).min(1),
                encoding: z.literal("stacked-alpha-h264"),
                weight: z.number().gte(0).optional(),
              })
              .strict(),
          )
          .min(1)
          .max(8),
      })
      .strict(),
    mouth: z
      .object({
        shapes: z.string().min(1),
        grid: z
          .object({
            cols: z.number().int().gte(1),
            rows: z.number().int().gte(1),
            tile: z
              .object({
                width: z.number().int().gte(1),
                height: z.number().int().gte(1),
              })
              .strict(),
          })
          .strict(),
        letters: z
          .object({
            A: z.number().int().gte(0),
            B: z.number().int().gte(0),
            C: z.number().int().gte(0),
            D: z.number().int().gte(0),
            E: z.number().int().gte(0),
            F: z.number().int().gte(0),
            G: z.number().int().gte(0),
            H: z.number().int().gte(0),
            wide: z.number().int().gte(0),
          })
          .strict(),
        flows: z
          .object({ file: z.string().min(1), flowScale: z.number().gt(0) })
          .strict(),
        anchor: z
          .object({
            x: z.number(),
            y: z.number(),
            w: z.number().gt(0),
            h: z.number().gt(0),
          })
          .strict(),
        warp: z.string().min(1).optional(),
      })
      .strict(),
    eyes: z
      .object({
        closed: z
          .object({
            file: z.string().min(1),
            box: z
              .object({
                x: z.number(),
                y: z.number(),
                w: z.number().gt(0),
                h: z.number().gt(0),
              })
              .strict(),
          })
          .strict(),
        half: z
          .object({
            file: z.string().min(1),
            box: z
              .object({
                x: z.number(),
                y: z.number(),
                w: z.number().gt(0),
                h: z.number().gt(0),
              })
              .strict(),
          })
          .strict(),
        wide: z
          .object({
            file: z.string().min(1),
            box: z
              .object({
                x: z.number(),
                y: z.number(),
                w: z.number().gt(0),
                h: z.number().gt(0),
              })
              .strict(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    emotion: z
      .object({
        angry: z
          .object({
            flow: z.string().min(1),
            residual: z.string().min(1),
            region: z
              .object({
                x: z.number(),
                y: z.number(),
                w: z.number().gt(0),
                h: z.number().gt(0),
              })
              .strict(),
            flowFull: z.number().gte(0),
          })
          .strict(),
        excited: z
          .object({
            flow: z.string().min(1),
            residual: z.string().min(1),
            region: z
              .object({
                x: z.number(),
                y: z.number(),
                w: z.number().gt(0),
                h: z.number().gt(0),
              })
              .strict(),
            flowFull: z.number().gte(0),
          })
          .strict(),
        alarmed: z
          .object({
            flow: z.string().min(1),
            residual: z.string().min(1),
            region: z
              .object({
                x: z.number(),
                y: z.number(),
                w: z.number().gt(0),
                h: z.number().gt(0),
              })
              .strict(),
            flowFull: z.number().gte(0),
          })
          .strict(),
        sad: z
          .object({
            flow: z.string().min(1),
            residual: z.string().min(1),
            region: z
              .object({
                x: z.number(),
                y: z.number(),
                w: z.number().gt(0),
                h: z.number().gt(0),
              })
              .strict(),
            flowFull: z.number().gte(0),
          })
          .strict(),
      })
      .strict(),
    life: z
      .object({
        nod: z.number(),
        brow: z.number(),
        gazeL: z.number(),
        gazeR: z.number(),
        gazeU: z.number(),
        eyeWide: z.number(),
        eyeSquint: z.number(),
        eyeClosed: z.number(),
        eyeHalf: z.number(),
        mCorner: z.number(),
        mAsymL: z.number(),
        mAsymR: z.number(),
        mUpper: z.number(),
        mPress: z.number(),
        mNostril: z.number(),
        mWrinkle: z.number(),
        smile: z.number(),
        mBrow: z.number(),
      })
      .strict(),
    budget: z.object({ bytes: z.number().int().gte(1).lte(12582912) }).strict(),
    provenance: z
      .object({
        maker: z.string().min(1),
        makerVersion: z.string().min(1),
        source: z.enum(["photo", "stylised", "generated"]),
        created: z.string().datetime({ offset: true }),
      })
      .strict(),
  })
  .strict()
  .describe(
    "PACK-01: a portable animation and expression pack for one companion.",
  );
export type CompanionPack = z.infer<typeof CompanionPack>;
