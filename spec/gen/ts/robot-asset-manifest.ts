// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/robot-asset-manifest.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

export const RobotAssetManifest = z
  .object({
    id: z.string().regex(new RegExp("^[a-z0-9][a-z0-9_-]{1,63}$")),
    file: z.string().regex(new RegExp("^[^/\\\\]+$")).min(1),
    sha256: z.string().regex(new RegExp("^[a-f0-9]{64}$")),
    bytes: z.number().int().gte(1),
    licence: z.string().min(1),
    source_url: z.string().url().regex(new RegExp("^https://")),
    kind: z.enum(["model", "clip_bundle", "moves", "wheelhouse"]),
  })
  .strict();
export type RobotAssetManifest = z.infer<typeof RobotAssetManifest>;
