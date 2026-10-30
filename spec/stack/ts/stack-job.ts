// Hand-written Zod mirror of ../schemas/stack-job.schema.json.
import { z } from "zod";

export const StackJobState = z.enum(["queued", "running", "waiting_for_you", "paused", "stalled", "done", "failed", "cancelled"]);
export type StackJobState = z.infer<typeof StackJobState>;

export const StackJobItemState = z.enum(["queued", "running", "paused", "stalled", "verifying", "failed", "done"]);
export type StackJobItemState = z.infer<typeof StackJobItemState>;

export const StackJobItem = z.object({
  id: z.string().min(1),
  companion_id: z.string().nullable().optional(),
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
  tier: z.enum(["reduced", "standard", "boost", "max"]).nullable().optional(),
  window: z.string().nullable().optional(),
  tier_reason: z.string().nullable().optional(),
  profile: z.object({
    lowered: z.number().int().nonnegative().optional(),
    queued: z.number().int().nonnegative().optional(),
    off: z.number().int().nonnegative().optional(),
    closed_apps: z.number().int().nonnegative().optional(),
    closed_bytes: z.number().int().nonnegative().optional(),
  }).strict().nullable().optional(),
}).strict();
export type StackJob = z.infer<typeof StackJob>;
