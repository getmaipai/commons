// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/offline-manifest.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**MEDIA-SPEC-01 for KEEP-OFFLINE-01 (media design sections 9 and 12). What a device needs to keep a record on the device: one entry per byte stream with its address on the hub, size, type, fingerprint and readiness, plus the person's progress when the record has one. Served by the hub's offline routes for any record kind that registers a provider (media first). FileTube's offline manifest, generalized.*/
export const OfflineManifest = z
  .object({
    /**The provider's record kind: media, news_story, reference_page, conversation.*/
    kind: z
      .string()
      .min(1)
      .describe(
        "The provider's record kind: media, news_story, reference_page, conversation.",
      ),
    id: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.union([z.string(), z.null()]).default(null),
    entries: z.array(
      z
        .object({
          id: z.string().min(1),
          title: z.union([z.string(), z.null()]).default(null),
          /**A hub path, never an outside address.*/
          url: z
            .string()
            .regex(new RegExp("^/"))
            .min(1)
            .describe("A hub path, never an outside address."),
          bytes: z.number().int().gte(0),
          mime: z.string().min(1),
          fingerprint: z.string().min(1),
          /**False while a transcode is queued; the file route answers 503 with Retry-After until it is.*/
          ready: z
            .boolean()
            .describe(
              "False while a transcode is queued; the file route answers 503 with Retry-After until it is.",
            ),
          playable: z.enum(["original", "transcode", "none", "unknown"]),
          reason: z
            .union([
              z.literal("notReady"),
              z.literal("notPlayable"),
              z.literal("notOnServer"),
              z.literal(null),
            ])
            .default(null),
          duration_s: z.union([z.number().gte(0), z.null()]).default(null),
          artwork_url: z
            .union([z.string().regex(new RegExp("^/")), z.null()])
            .default(null),
          chapters: z
            .array(
              z
                .object({ start_s: z.number().gte(0), title: z.string() })
                .strict(),
            )
            .default([]),
          subtitles: z
            .array(
              z
                .object({
                  lang: z.string(),
                  label: z.union([z.string(), z.null()]).default(null),
                  url: z.string().regex(new RegExp("^/")),
                })
                .strict(),
            )
            .default([]),
          progress: z
            .union([
              z
                .object({
                  position_s: z.number().gte(0),
                  completed: z.boolean(),
                })
                .strict(),
              z.null(),
            ])
            .default(null),
        })
        .strict(),
    ),
    total_bytes: z.number().int().gte(0).default(0),
    generated_at: z.string().datetime({ offset: true }),
  })
  .strict()
  .describe(
    "MEDIA-SPEC-01 for KEEP-OFFLINE-01 (media design sections 9 and 12). What a device needs to keep a record on the device: one entry per byte stream with its address on the hub, size, type, fingerprint and readiness, plus the person's progress when the record has one. Served by the hub's offline routes for any record kind that registers a provider (media first). FileTube's offline manifest, generalized.",
  );
export type OfflineManifest = z.infer<typeof OfflineManifest>;
