// Hand-written Zod mirror of ../schemas/stack-part-choices.schema.json.
import { z } from "zod";

const Ids = z.array(z.string().min(1)).refine((v) => new Set(v).size === v.length);
const Choice = z.object({ order: Ids, off: Ids }).strict();
export const StackPartChoices = z.record(z.string().min(1), Choice);
export type StackPartChoices = z.infer<typeof StackPartChoices>;
