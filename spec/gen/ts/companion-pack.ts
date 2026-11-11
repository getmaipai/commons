// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/companion-pack.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**PACK-01b: a portable animation and expression pack for one companion. MAKER-G: a pack with a voice layer may be a still picture plus reactive parts (no video). `states`, `mouth`, `emotion` and `life` are required unless `voice` is present; validateCompanionPack enforces that.*/
export const CompanionPack = z
  .object({
    version: z.literal(1),
    id: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
    name: z.string().min(1),
    /**Optional frame the layer coordinates are pixels of: the visible tile is the square starting at (x0, 0) with side size. Absent means x0 224 and size 576 (the demo packs).*/
    source: z
      .object({ x0: z.number().gte(0), size: z.number().gt(0) })
      .strict()
      .describe(
        "Optional frame the layer coordinates are pixels of: the visible tile is the square starting at (x0, 0) with side size. Absent means x0 224 and size 576 (the demo packs).",
      )
      .optional(),
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
                phone: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.mp4$"),
                  )
                  .optional(),
                fps: z.number().gt(0),
                frames: z.number().int().gte(1),
                rest: z
                  .object({
                    first: z.number().int().gte(0),
                    last: z.number().int().gte(0),
                  })
                  .strict(),
                track: z.array(z.number()).min(1),
                trackFile: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.json$"),
                  ),
                encoding: z.literal("stacked-alpha-h264"),
                weight: z.number().gte(0).optional(),
                gesture: z
                  .object({
                    kind: z.enum(["nod", "tilt", "glance", "settle"]),
                    amp: z.union([z.literal(1), z.literal(2), z.literal(3)]),
                  })
                  .strict()
                  .optional(),
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
                phone: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.mp4$"),
                  )
                  .optional(),
                fps: z.number().gt(0),
                frames: z.number().int().gte(1),
                rest: z
                  .object({
                    first: z.number().int().gte(0),
                    last: z.number().int().gte(0),
                  })
                  .strict(),
                track: z.array(z.number()).min(1),
                trackFile: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.json$"),
                  ),
                encoding: z.literal("stacked-alpha-h264"),
                weight: z.number().gte(0).optional(),
                gesture: z
                  .object({
                    kind: z.enum(["nod", "tilt", "glance", "settle"]),
                    amp: z.union([z.literal(1), z.literal(2), z.literal(3)]),
                  })
                  .strict()
                  .optional(),
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
                phone: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.mp4$"),
                  )
                  .optional(),
                fps: z.number().gt(0),
                frames: z.number().int().gte(1),
                rest: z
                  .object({
                    first: z.number().int().gte(0),
                    last: z.number().int().gte(0),
                  })
                  .strict(),
                track: z.array(z.number()).min(1),
                trackFile: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.json$"),
                  ),
                encoding: z.literal("stacked-alpha-h264"),
                weight: z.number().gte(0).optional(),
                gesture: z
                  .object({
                    kind: z.enum(["nod", "tilt", "glance", "settle"]),
                    amp: z.union([z.literal(1), z.literal(2), z.literal(3)]),
                  })
                  .strict()
                  .optional(),
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
                phone: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.mp4$"),
                  )
                  .optional(),
                fps: z.number().gt(0),
                frames: z.number().int().gte(1),
                rest: z
                  .object({
                    first: z.number().int().gte(0),
                    last: z.number().int().gte(0),
                  })
                  .strict(),
                track: z.array(z.number()).min(1),
                trackFile: z
                  .string()
                  .regex(
                    new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+\\.json$"),
                  ),
                encoding: z.literal("stacked-alpha-h264"),
                weight: z.number().gte(0).optional(),
                gesture: z
                  .object({
                    kind: z.enum(["nod", "tilt", "glance", "settle"]),
                    amp: z.union([z.literal(1), z.literal(2), z.literal(3)]),
                  })
                  .strict()
                  .optional(),
              })
              .strict(),
          )
          .min(1)
          .max(8),
      })
      .strict()
      .optional(),
    mouth: z
      .object({
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
        anchor: z
          .object({
            x: z.number(),
            y: z.number(),
            w: z.number().gt(0),
            h: z.number().gt(0),
          })
          .strict(),
        calm: z
          .object({
            dir: z
              .string()
              .regex(new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+")),
          })
          .strict(),
        shout: z
          .object({
            dir: z
              .string()
              .regex(new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+")),
          })
          .strict()
          .optional(),
        warp: z.boolean().optional(),
        flowEncoding: z.enum(["int16", "int16-deflate"]).optional(),
      })
      .strict()
      .optional(),
    head: z
      .object({
        dir: z.string().regex(new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+")),
        flowEncoding: z.enum(["int16", "int16-deflate"]).optional(),
      })
      .strict()
      .optional(),
    eyes: z
      .object({
        dir: z.string().regex(new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+")),
      })
      .strict()
      .optional(),
    emotion: z
      .object({
        dir: z.string().regex(new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+")),
        kinds: z
          .array(z.enum(["angry", "excited", "alarmed", "sad"]))
          .min(1)
          .refine(
            (arr) => arr.every((item, i) => arr.indexOf(item) == i),
            "All items must be unique!",
          ),
        flowEncoding: z.enum(["int16", "int16-deflate"]).optional(),
      })
      .strict()
      .optional(),
    rest: z.string().regex(new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+")),
    life: z
      .object({
        nod: z.number().gte(0).lte(4).optional(),
        brow: z.number().gte(0).lte(4).optional(),
        gazeL: z.number().gte(0).lte(4).optional(),
        gazeR: z.number().gte(0).lte(4).optional(),
        gazeU: z.number().gte(0).lte(4).optional(),
        eyeWide: z.number().gte(0).lte(4).optional(),
        eyeSquint: z.number().gte(0).lte(4).optional(),
        eyeClosed: z.number().gte(0).lte(4).optional(),
        eyeHalf: z.number().gte(0).lte(4).optional(),
        mCorner: z.number().gte(0).lte(4).optional(),
        mAsymL: z.number().gte(0).lte(4).optional(),
        mAsymR: z.number().gte(0).lte(4).optional(),
        mUpper: z.number().gte(0).lte(4).optional(),
        mPress: z.number().gte(0).lte(4).optional(),
        mNostril: z.number().gte(0).lte(4).optional(),
        mWrinkle: z.number().gte(0).lte(4).optional(),
        smile: z.number().gte(0).lte(4).optional(),
        mBrow: z.number().gte(0).lte(4).optional(),
      })
      .strict()
      .optional(),
    budget: z
      .object({
        bytes: z.number().int().gte(1).lte(12582912),
        phoneBytes: z.number().int().gte(0).optional(),
      })
      .strict(),
    voice: z
      .object({
        base: z
          .string()
          .regex(new RegExp("^(?!/)(?!.*\\.\\.)(?!.*\\.webm$).+"))
          .optional(),
        parts: z
          .array(
            z
              .object({
                id: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
                file: z
                  .string()
                  .regex(new RegExp("^(?!/)(?!.*\\.\\.).+\\.(webp|png)$")),
                box: z
                  .object({
                    x: z.number(),
                    y: z.number(),
                    w: z.number().gt(0),
                    h: z.number().gt(0),
                  })
                  .strict(),
                anchor: z
                  .object({
                    x: z.number().gte(0).lte(1),
                    y: z.number().gte(0).lte(1),
                  })
                  .strict()
                  .optional(),
                z: z.number().int().gte(0).lte(99).optional(),
                glow: z
                  .object({
                    color: z.string().regex(new RegExp("^#[0-9a-fA-F]{6}$")),
                    blur: z.number().gte(0).lte(96).optional(),
                  })
                  .strict()
                  .optional(),
                effects: z
                  .array(
                    z
                      .object({
                        channel: z.enum(["level", "cue_energy", "state"]),
                        curve: z
                          .enum([
                            "linear",
                            "ease-in",
                            "ease-out",
                            "smooth",
                            "pulse",
                            "blink",
                          ])
                          .optional(),
                        smoothing: z
                          .object({
                            attackMs: z.number().gte(0).lte(2000).optional(),
                            releaseMs: z.number().gte(0).lte(5000).optional(),
                          })
                          .strict()
                          .optional(),
                        drive: z
                          .object({
                            idle: z
                              .object({
                                amount: z.number().gte(0).lte(1).optional(),
                                hz: z.number().gte(0).lte(4).optional(),
                                depth: z.number().gte(0).lte(1).optional(),
                                beat: z.boolean().optional(),
                              })
                              .strict()
                              .optional(),
                            listen: z
                              .object({
                                amount: z.number().gte(0).lte(1).optional(),
                                hz: z.number().gte(0).lte(4).optional(),
                                depth: z.number().gte(0).lte(1).optional(),
                                beat: z.boolean().optional(),
                              })
                              .strict()
                              .optional(),
                            think: z
                              .object({
                                amount: z.number().gte(0).lte(1).optional(),
                                hz: z.number().gte(0).lte(4).optional(),
                                depth: z.number().gte(0).lte(1).optional(),
                                beat: z.boolean().optional(),
                              })
                              .strict()
                              .optional(),
                            speak: z
                              .object({
                                amount: z.number().gte(0).lte(1).optional(),
                                hz: z.number().gte(0).lte(4).optional(),
                                depth: z.number().gte(0).lte(1).optional(),
                                beat: z.boolean().optional(),
                              })
                              .strict()
                              .optional(),
                            interrupt: z
                              .object({
                                amount: z.number().gte(0).lte(1).optional(),
                                hz: z.number().gte(0).lte(4).optional(),
                                depth: z.number().gte(0).lte(1).optional(),
                                beat: z.boolean().optional(),
                              })
                              .strict()
                              .optional(),
                          })
                          .strict()
                          .optional(),
                        blinkMs: z.number().gte(40).lte(1000).optional(),
                        scale: z.array(z.number()).min(2).max(2).optional(),
                        scaleX: z.array(z.number()).min(2).max(2).optional(),
                        scaleY: z.array(z.number()).min(2).max(2).optional(),
                        rotate: z.array(z.number()).min(2).max(2).optional(),
                        translate: z
                          .object({
                            x: z.array(z.number()).min(2).max(2).optional(),
                            y: z.array(z.number()).min(2).max(2).optional(),
                          })
                          .strict()
                          .optional(),
                        opacity: z.array(z.number()).min(2).max(2).optional(),
                        brightness: z
                          .array(z.number())
                          .min(2)
                          .max(2)
                          .optional(),
                        glow: z.array(z.number()).min(2).max(2).optional(),
                      })
                      .strict(),
                  )
                  .min(1)
                  .max(8),
              })
              .strict(),
          )
          .min(1)
          .max(12),
        presets: z
          .object({
            idle: z
              .object({ gain: z.number().gte(0).lte(2).optional() })
              .strict()
              .optional(),
            listen: z
              .object({ gain: z.number().gte(0).lte(2).optional() })
              .strict()
              .optional(),
            think: z
              .object({ gain: z.number().gte(0).lte(2).optional() })
              .strict()
              .optional(),
            speak: z
              .object({ gain: z.number().gte(0).lte(2).optional() })
              .strict()
              .optional(),
            interrupt: z
              .object({ gain: z.number().gte(0).lte(2).optional() })
              .strict()
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    provenance: z
      .object({
        maker: z.string().min(1),
        makerVersion: z.string(),
        source: z.enum(["photo", "stylised", "generated"]),
        created: z.string().datetime({ offset: true }),
      })
      .strict(),
  })
  .strict()
  .describe(
    "PACK-01b: a portable animation and expression pack for one companion. MAKER-G: a pack with a voice layer may be a still picture plus reactive parts (no video). `states`, `mouth`, `emotion` and `life` are required unless `voice` is present; validateCompanionPack enforces that.",
  );
export type CompanionPack = z.infer<typeof CompanionPack>;
