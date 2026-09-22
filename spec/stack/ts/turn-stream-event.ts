// Hand-written Zod mirror of ../schemas/turn-stream-event.schema.json.
import { z } from "zod";

export const TurnStreamEvent = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("tool_call"),
    package_id: z.string().min(1),
    args: z.record(z.string(), z.unknown()),
    call_id: z.string().min(1),
    label: z.string().min(1).optional(),
  }).strict(),
  z.object({
    t: z.literal("tool_result"),
    call_id: z.string().min(1),
    package_id: z.string().min(1),
    outcome: z.object({ text: z.string().optional(), error_code: z.string().optional() }).strict(),
  }).strict(),
  z.object({
    t: z.literal("tool_error"),
    call_id: z.string().min(1),
    package_id: z.string().min(1),
    error: z.string().min(1),
  }).strict(),
]);
export type TurnStreamEvent = z.infer<typeof TurnStreamEvent>;
