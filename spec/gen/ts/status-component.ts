// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/status-component.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

export const StatusComponent = z.union([
  z.enum([
    "chat",
    "embed",
    "background",
    "voice",
    "library",
    "hub",
    "internet",
  ]),
  z.string().regex(new RegExp("^service:[a-z0-9][a-z0-9_-]{0,63}$")),
]);
export type StatusComponent = z.infer<typeof StatusComponent>;
