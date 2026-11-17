// Hand-written Zod mirror of ../schemas/stack-sizing.schema.json.
import { z } from "zod";
import { StackPartId } from "./stack-part";

const Tier = z.object({ part_id: StackPartId.nullable(), fits: z.boolean(), reason: z.string().nullable() }).strict();
export const StackSizing = z.object({ percent: z.number().int().min(1).max(100), budget_bytes: z.number().int().nonnegative(), categories: z.array(z.object({ category: z.string().min(1), tiers: z.object({ standard: Tier, boost: Tier, max: Tier }).strict(), line: z.string().min(1) }).strict()) }).strict();
export type StackSizing = z.infer<typeof StackSizing>;
