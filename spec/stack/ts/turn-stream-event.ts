// Hand-written Zod mirror of ../schemas/turn-stream-event.schema.json.
import { z } from "zod";
import { AnswerBlock } from "../../gen/ts/answer-block.js";

// TOOL-EVENTS-02: one definition for `tool_result.outcome.sites`'s own
// cap, matching the schema's `maxItems` - a consumer slicing to a
// hardcoded `5` of its own would silently drift from this the moment
// either number changes alone (a code review, 2026-09-24, caught
// exactly that as its own literal in home's tool.ts).
export const TOOL_RESULT_SITES_MAX = 5;

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
    outcome: z.object({
      text: z.string().optional(),
      error_code: z.string().optional(),
      sites: z.array(z.object({ host: z.string().min(1), url: z.string().url() }).strict()).max(TOOL_RESULT_SITES_MAX).optional(),
    }).strict(),
  }).strict(),
  // GENUI-01: one validated, floored answer block, streamed as soon as the
  // call's tool result lands. The block shape is the generated AnswerBlock.
  z.object({
    t: z.literal("block"),
    call_id: z.string().min(1),
    block: AnswerBlock,
  }).strict(),
  z.object({
    t: z.literal("tool_error"),
    call_id: z.string().min(1),
    package_id: z.string().min(1),
    error: z.string().min(1),
  }).strict(),
]);
export type TurnStreamEvent = z.infer<typeof TurnStreamEvent>;
