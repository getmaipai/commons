// Hand-written Zod mirror of ../schemas/stack-part.schema.json.
import { z } from "zod";
import { ModelCapabilities } from "../../gen/ts/model-capabilities";

export const StackPartKind = z.enum(["model", "tool", "engine"]);
export type StackPartKind = z.infer<typeof StackPartKind>;
export const StackPartId = z.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/);
const Options = z.record(z.string(), z.unknown());
const File = z.object({ url: z.string().url().regex(/^https:\/\//), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().nonnegative(), path: z.string().min(1).optional() }).strict();
const Licence = z.object({ name: z.string().min(1), notice_id: z.string().nullable() }).strict();
const Build = z.object({ tier: z.enum(["standard", "boost", "max"]), options: Options }).strict();
const Peak = z.object({ options: Options, bytes: z.number().int().nonnegative(), status: z.enum(["measured", "unverified"]), measured_on: z.string().min(1).optional() }).strict();
const Chat = ModelCapabilities.pick({ sampling: true, thinking_mode: true, image_input: true, turn_budget: true, model_cutoff: true }).strict();
export const StackPart = z.object({ id: StackPartId, kind: StackPartKind, category: z.string().min(1), priority: z.number().int().min(1), label: z.string().min(1), neutral_label: z.string().min(1), description: z.string().min(1), adult_only: z.boolean(), minor_only: z.boolean().optional().default(false), chat: Chat.optional(), version: z.string().min(1), files: z.array(File).min(1), licence: Licence, runner: StackPartId.nullable(), requires: z.array(StackPartId).refine((v) => new Set(v).size === v.length), builds: z.array(Build).optional(), peaks: z.array(Peak), min_stack: z.string().min(1) }).strict().superRefine((value, ctx) => { if (value.category !== "chat" && value.chat !== undefined) ctx.addIssue({ code: "custom", path: ["chat"], message: "chat is only allowed for chat parts" }); if (value.adult_only && value.minor_only) ctx.addIssue({ code: "custom", path: ["minor_only"], message: "adult_only and minor_only cannot both be true" }); });
export type StackPart = z.infer<typeof StackPart>;
