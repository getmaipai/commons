// Hand-written Zod mirror of ../schemas/stack-part-view.schema.json.
import { z } from "zod";

import { StackPartId, StackPartKind } from "./stack-part";
import { ModelCapabilities } from "../../gen/ts/model-capabilities";
const Chat = ModelCapabilities.pick({ sampling: true, thinking_mode: true, image_input: true, turn_budget: true, model_cutoff: true }).strict();
export const StackPartView = z.object({ id: StackPartId, kind: StackPartKind, category: z.string().min(1), chat: Chat.optional(), priority: z.number().int().min(1), label: z.string().min(1), description: z.string(), enabled: z.boolean(), state: z.enum(["ready", "missing", "installing", "updating", "failed", "unsupported"]), size_bytes: z.number().int().nonnegative(), download_bytes: z.number().int().nonnegative(), percent: z.number().min(0).max(100).nullable(), fits: z.object({ standard: z.boolean(), boost: z.boolean(), max: z.boolean(), reason: z.string().nullable() }).strict(), can_install: z.boolean(), install_block: z.string().nullable(), can_uninstall: z.boolean(), uninstall_block: z.string().nullable(), licence_needed: z.boolean(), required_by: z.array(StackPartId), update: z.object({ available: z.boolean(), version: z.string().nullable() }).strict() }).strict();
export type StackPartView = z.infer<typeof StackPartView>;
