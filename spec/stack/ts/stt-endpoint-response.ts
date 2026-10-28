// Hand-written Zod mirror of ../schemas/stt-endpoint-response.schema.json.
import { z } from "zod";

export const SttEndpointResponse = z.object({ complete: z.boolean(), probability: z.number().min(0).max(1) }).strict();
export type SttEndpointResponse = z.infer<typeof SttEndpointResponse>;
