// Shared context fields emitted flat on each GET /stack/v1/roles row.
// Home sizes the chat turn from context_per_slot; context_total is a
// separate reporting figure and must never be used as the request window.
import { z } from "zod";

export const ChatRoleContextSchema = z.object({
  context_length: z.number().nullable().optional(),
  context_per_slot: z.number().nullable().optional(),
  context_total: z.number().nullable().optional(),
  slots: z.number().nullable().optional(),
  context_scope: z.enum(["total across slots", "per slot"]).nullable().optional(),
});

export type ChatRoleContext = z.infer<typeof ChatRoleContextSchema>;
