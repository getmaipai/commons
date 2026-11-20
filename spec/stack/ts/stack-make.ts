// Hand-written Zod mirror of ../schemas/stack-make-request.schema.json,
// stack-make-result.schema.json and stack-make-refusal.schema.json.
// MODELPACK-SPEC-01: the generic jobs (eight picture and clip jobs, six music jobs). A request names a job and its
// inputs; it may name a `part` only with an opaque id the Stack gave it.
import { z } from "zod";

import { StackPartId } from "./stack-part";
import { StackJobAudience, StackJobLevel, StackJobShape } from "./stack-model-pack";

const text = z.string().min(1);
const secs = z.number().positive();
// `wait`: whole seconds the caller will wait for the answer; 0 answers 202 with the job id at once, 120 is the cap.
const common = { audience: StackJobAudience, part: StackPartId.optional(), wait: z.number().int().min(0).max(120).optional() };
const req = <J extends string, T extends z.ZodRawShape>(job: J, shape: T) => z.object({ job: z.literal(job), ...common, ...shape }).strict();

// What song_edit changes. Trim, fade and loudness run no model, so no pack serves them and they are not here.
export const StackSongChange = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cover"), strength: z.number().positive().max(1).optional(), style_words: z.array(text).optional(), description: text.optional(), lyrics: text.optional() }).strict(),
  z.object({ kind: z.literal("repaint"), from_seconds: z.number().min(0), to_seconds: secs, description: text.optional(), lyrics: text.optional() }).strict(),
  z.object({ kind: z.literal("extend"), add_seconds: secs, at: z.enum(["start", "end"]).optional() }).strict(),
]);

export const StackMakeRequest = z.discriminatedUnion("job", [
  req("picture", { description: text, words: text.optional(), shape: StackJobShape, level: StackJobLevel, count: z.number().int().min(1).optional(), styles: z.array(text).optional(), seed: z.number().int().optional() }),
  req("picture_edit", { picture: text, description: text, words: text.optional(), references: z.array(text).optional(), mask: text.optional(), level: StackJobLevel, styles: z.array(text).optional() }),
  req("clip", { description: text, shape: StackJobShape, level: StackJobLevel, seconds: secs, start_picture: text.optional(), end_picture: text.optional(), styles: z.array(text).optional(), seed: z.number().int().optional() }),
  req("clip_from_sheet", { sheet: text, description: text, shape: StackJobShape, level: StackJobLevel, seconds: secs }),
  req("restyle", { clip: text, restyle: text, description: text.optional() }),
  req("swap", { clip: text, references: z.array(text).min(1), description: text.optional(), start_seconds: z.number().min(0).optional(), seconds: secs, level: StackJobLevel }),
  req("character_sheet", { references: z.array(text).min(1), description: text.optional(), kind: z.enum(["person", "object", "pet"]), level: StackJobLevel }),
  req("contact_sheet", { references: z.array(text).min(1), description: text.optional(), count: z.number().int().min(1), level: StackJobLevel }),
  // The music family. Ids are opaque, as above; the words are the person's own (never logged by the pack).
  req("song", { description: text, lyrics: text.optional(), style_words: z.array(text).optional(), seconds: secs, level: StackJobLevel.optional(), seed: z.number().int().min(0).optional(), bpm: z.number().positive().optional(), key: text.optional(), language: text.optional() }),
  req("song_edit", { song: text, change: StackSongChange, level: StackJobLevel.optional() }),
  req("sound_effect", { description: text, seconds: secs }),
  req("stems", { song: text, stems: z.array(text).min(1), origin: z.literal("owned_file").optional() }),
  req("vocal_swap", { vocal: text, references: z.array(text).min(1), description: text.optional() }),
  req("lyric_timing", { song: text, lyrics: text }),
]);
export type StackMakeRequest = z.infer<typeof StackMakeRequest>;

export const StackMadeWith = z.object({ part: StackPartId, label: text, pack_version: text, shape: StackJobShape.nullable(), seconds: z.number().min(0).nullable(), sound: z.boolean(), notes: z.array(text) }).strict();
export type StackMadeWith = z.infer<typeof StackMadeWith>;

const resBase = { id: text, state: z.enum(["queued", "running", "waiting_for_you", "paused", "stalled", "done", "failed", "cancelled"]), percent: z.number().int().min(0).max(100), status: z.string(), files: z.array(text), poster: text.nullable(), made_with: StackMadeWith.nullable() };
const plainJobs = z.enum(["picture", "picture_edit", "clip", "clip_from_sheet", "restyle", "swap", "sound_effect", "vocal_swap"]);
// A song, a song edit and a stems split always name what made them, running or done, so made_with is never null for them.
const madeJobs = { ...resBase, made_with: StackMadeWith };
export const StackMakeResult = z.union([
  z.object({ ...resBase, job: plainJobs }).strict(),
  z.object({ ...madeJobs, job: z.enum(["song", "song_edit"]) }).strict(),
  z.object({ ...resBase, job: z.literal("character_sheet"), panels: z.array(text) }).strict(),
  z.object({ ...resBase, job: z.literal("contact_sheet"), tiles: z.array(text) }).strict(),
  z.object({ ...madeJobs, job: z.literal("stems"), stems: z.array(z.object({ name: text, file: text }).strict()) }).strict(),
  z.object({ ...resBase, job: z.literal("lyric_timing"), timings: z.array(z.object({ start_seconds: z.number().min(0), text }).strict()) }).strict(),
]);
export type StackMakeResult = z.infer<typeof StackMakeResult>;

export const StackMakeRefusal = z.union([
  z.object({ code: z.enum(["too_many_references", "too_long"]), line: text, limit: z.number().min(0) }).strict(),
  z.object({ code: z.enum(["shape_not_served", "level_not_served"]), line: text }).strict(),
  z.object({ code: z.literal("not_on_this_model"), line: text, alternatives: z.array(z.object({ part: StackPartId, label: text }).strict()) }).strict(),
]);
export type StackMakeRefusal = z.infer<typeof StackMakeRefusal>;
