// Hand-written Zod mirror of ../schemas/stack-status.schema.json.
import { z } from "zod";
import { StackPartId } from "./stack-part";

const NullablePartId = StackPartId.nullable();
export const StackStatus = z.object({ health: z.enum(["ok", "degraded", "down", "updating"]), busy: z.object({ running: z.number().int().nonnegative(), waiting: z.number().int().nonnegative() }).strict(), using: z.array(z.object({ part_id: StackPartId, bytes: z.number().int().nonnegative(), job_id: z.string().nullable() }).strict()), memory: z.object({ total_bytes: z.number().int().nonnegative(), free_bytes: z.number().int().nonnegative(), budget_bytes: z.number().int().nonnegative(), pressure: z.enum(["normal", "warn", "critical"]) }).strict(), jobs: z.array(z.object({ id: z.string(), kind: z.string(), part_id: NullablePartId, state: z.enum(["running", "waiting", "failed", "done"]), reason: z.string().nullable(), percent: z.number().min(0).max(100).nullable() }).strict()), problems: z.array(z.object({ code: z.string().min(1), part_id: NullablePartId, plain: z.string().min(1), fix: z.string().min(1), since: z.string().datetime({ offset: true }) }).strict()) }).strict();
export type StackStatus = z.infer<typeof StackStatus>;
