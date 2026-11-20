// Hand-written Zod mirror of ../schemas/stack-video-receipt.schema.json.
// VF-RECEIPT-01 (Home docs/design/video-film-pipeline-2026-11-20.md, section 3.4). One record per video job, written by the
// Stack beside the result, the same for every run. It belongs to the job owner's record (rule 6a): it holds the prompt as a
// byte count and a hash, never its text, and each input as a role and a hash, never a file name. No log, status or admin
// view carries any of it. The result names it only by `made_with.receipt` (the job id the owner's route answers for).
import { z } from "zod";

const text = z.string().min(1);
const count = z.number().int().min(0);
const sha = z.string().regex(/^[0-9a-f]{64}$/);

export const StackReceiptOperation = z.enum(["generate", "swap", "ingredients", "extend", "retake", "restyle"]);
export const StackReceiptRole = z.enum(["start", "end", "identity", "wardrobe", "voice_reference", "edit_source", "source_clip", "sheet", "reference"]);

// What a probe of one file found. Taken from the file itself, never from what the generator reported.
export const StackReceiptFile = z.object({
  width: z.number().int().positive(), height: z.number().int().positive(), frames: count, fps: z.number().positive(),
  seconds: z.number().min(0), audio: z.boolean(), bytes: count,
}).strict();

export const StackVideoReceipt = z.object({
  version: z.literal(1),
  job_id: text,
  operation: StackReceiptOperation,
  made_at: z.string().datetime({ offset: true }),
  runtime: z.object({ id: text, revision: text }).strict(),
  model: z.object({ id: text, build: text, quantization: text.nullable() }).strict(),
  steps: z.object({ count: count.nullable(), schedule: text.nullable() }).strict(),
  adapter: z.object({ id: text, strength: z.number().nullable(), sha256: sha.nullable() }).strict().nullable(),
  inputs: z.array(z.object({ role: StackReceiptRole, sha256: sha, bytes: count }).strict()),
  requested: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), frames: count, seconds: z.number().min(0) }).strict(),
  // Native: the file the model made, kept as it was. Delivered: the file the owner's file route serves (the default, `video.mp4`).
  native: StackReceiptFile,
  delivered: StackReceiptFile,
  delivered_is: z.enum(["native", "finished", "messaging_copy"]),
  seed: z.number().int().nullable(),
  phases: z.array(z.object({ name: text, ms: count }).strict()),
  peak_memory_bytes: count.nullable(),
  finish: z.array(z.object({
    operation: text,
    from: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
    to: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
    ok: z.boolean(),
    code: text.nullable(),
  }).strict()),
  // VF-PROMPT-01: which prompt writer made the text the engine was given, its version, and the hints it recorded (counts and advice only; never the text).
  prompt: z.object({ bytes: count, sha256: sha, writer: z.object({ id: text, version: text }).strict().optional(), hints: z.array(text).optional() }).strict(),
  // VF-ROUTE-01: the route the Stack chose for a generic-door clip and why (additive; absent on the legacy door).
  route: z.object({ name: text, reason: text }).strict().optional(),
  // VF-TAKES-01: the first take this clip is another take of (a sibling link; the first take is never overwritten).
  take_of: text.optional(),
  // VF-MINOR-RECIPE-01: the recipe that wrote the prompt, by id and version (never its text).
  recipe: z.object({ id: text, version: text }).strict().optional(),
  // VF-FACE-ROLE-01: a reference clip's face checks, by role and position only (no pictures, no names). `first_picture`: each placed person's face against their own photo, with the
  // re-draw count used; `clip`: the per-person median over the sampled frames and whether it fell below the pack's low flag. `gate`/`low` echo the pack numbers the checks used.
  face_check: z.object({
    gate: z.number().min(0).max(1),
    low: z.number().min(0).max(1),
    first_picture: z.object({ redraws: z.number().int().min(0), people: z.array(z.object({ index: z.number().int().min(0), score: z.number().nullable(), pass: z.boolean() }).strict()) }).strict().optional(),
    clip: z.object({ frames: z.number().int().min(0), people: z.array(z.object({ index: z.number().int().min(0), median: z.number().nullable(), low: z.boolean() }).strict()) }).strict().optional(),
  }).strict().optional(),
}).strict();
export type StackVideoReceipt = z.infer<typeof StackVideoReceipt>;
