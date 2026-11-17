// Hand-written Zod mirror of ../schemas/stack-part-list.schema.json.
import { z } from "zod";

import { StackPartView } from "./stack-part-view";
export const StackPartList = z.object({ audience: z.enum(["adult", "minor"]), parts: z.array(StackPartView) }).strict();
export type StackPartList = z.infer<typeof StackPartList>;
