// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/status-component.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

export const StatusComponent = z.enum([
  "chat",
  "embed",
  "background",
  "voice",
  "library",
  "hub",
]);
export type StatusComponent = z.infer<typeof StatusComponent>;
