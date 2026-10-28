// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/quick-action.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**An id for a quick action offered by the ambient companion pane.*/
export const QuickAction = z
  .enum(["help_with_page", "find_something", "take_action"])
  .describe("An id for a quick action offered by the ambient companion pane.");
export type QuickAction = z.infer<typeof QuickAction>;
