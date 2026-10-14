// Hand-written Zod mirror of ../schemas/stack-job.schema.json.
import { z } from "zod";

export const StackJobState = z.enum(["queued", "running", "waiting_for_you", "paused", "stalled", "done", "failed", "cancelled"]);
export type StackJobState = z.infer<typeof StackJobState>;

export const StackJobItemState = z.enum(["queued", "running", "paused", "stalled", "verifying", "failed", "done"]);
export type StackJobItemState = z.infer<typeof StackJobItemState>;

export const StackJobItem = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  completedBytes: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  state: StackJobItemState,
}).strict();
export type StackJobItem = z.infer<typeof StackJobItem>;

export const StackJob = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  role: z.string().nullable(),
  state: StackJobState,
  percent: z.number().int().min(0).max(100),
  completedBytes: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  bytesPerSecond: z.number().nonnegative().optional(),
  items: z.array(StackJobItem).optional(),
  status: z.string(),
  position: z.number().int().min(1).nullable(),
  input: z.record(z.string(), z.unknown()).nullable(),
  result: z.unknown().nullable(),
  reason: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
}).strict();
export type StackJob = z.infer<typeof StackJob>;
