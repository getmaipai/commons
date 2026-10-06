// Hand-written Zod mirrors of ../schemas/token-count-request.schema.json
// and token-count-response.schema.json (STACK-TOKENIZE-01): the Stack's
// POST /v1/tokenize, the chat engine's own token count.
import { z } from "zod";

export const TokenCountRequest = z.object({
  model: z.string().min(1),
  timeout_ms: z.number().int().min(1).optional(),
  messages: z.array(z.object({ role: z.string() }).passthrough()).optional(),
  content: z.string().optional(),
  tools: z.array(z.unknown()).optional(),
  chat_template_kwargs: z.record(z.string(), z.unknown()).optional(),
}).passthrough().refine((value) => (value.messages === undefined) !== (value.content === undefined), { message: "Send exactly one of `messages` or `content`." });
export type TokenCountRequest = z.infer<typeof TokenCountRequest>;

export const TokenCountResponse = z.object({ count: z.number().int().min(0) }).strict();
export type TokenCountResponse = z.infer<typeof TokenCountResponse>;
