// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/firmware-flash-manifest.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Signed firmware image layout for browser-based flashing. Offsets are supplied by the manifest producer.*/
export const FirmwareFlashManifest = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
    builds: z
      .array(
        z
          .object({
            chipFamily: z.enum([
              "ESP32",
              "ESP32-C3",
              "ESP32-C6",
              "ESP32-S2",
              "ESP32-S3",
              "ESP8266",
            ]),
            parts: z
              .array(
                z
                  .object({
                    path: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$))(?!.*\\\\)[^\\\\]+$",
                        ),
                      )
                      .min(1),
                    offset: z.number().int().gte(0),
                    size: z.number().int().gte(0),
                    sha256: z.string().regex(new RegExp("^[a-f0-9]{64}$")),
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
    flash_size: z.string().regex(new RegExp("^[1-9][0-9]*MB$")),
    provenance: z.string().min(1),
    created_at: z.string().datetime({ offset: true }),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
    signature: z
      .object({ keyid: z.string().min(1), sig: z.string().min(1) })
      .strict(),
  })
  .strict()
  .describe(
    "Signed firmware image layout for browser-based flashing. Offsets are supplied by the manifest producer.",
  );
export type FirmwareFlashManifest = z.infer<typeof FirmwareFlashManifest>;
