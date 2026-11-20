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

// VF-ROLES-01: optional typed inputs and structured speech on a clip, beside the plain description. All additive: a clip with only `start_picture` and
// `end_picture` still means the opening and closing frames, and identity is never inferred from either. `level` stays the one quality key (there is
// no `profile` field on the wire; a profile is only a spec-defined name for a group of levels).
// `object` and `place` (VF-REFCLIP-01): a thing or a location a reference clip uses beside the people (identity).
export const StackClipInputRole = z.enum(["identity", "wardrobe", "voice_reference", "edit_source", "object", "place"]);
// `derived_start` (VF-ROUTE-DERIVE-01): the resend after a `needs_start_picture` answer, whose start picture the caller made through one generic `picture` job. The Stack records it in the receipt; a request that carries a start picture is never answered `needs_start_picture` again.
export const StackClipIntent = z.enum(["open_on_picture", "new_shot", "derived_start"]);
// The operations a clip job may be asked for beyond a plain take; each needs its own row before a pack serves it.
// `clip_film_shot` (VF-ROUTE-01 follow-up): the clip is a film shot. The Stack, never the caller, chooses the recipe from the operation and what this computer can hold (full HD at Max when admitted, else the next recipe down); there is no size field.
// restyle (VF-RESTYLE-OP-01), companion_take (VF-COMPANION-RECIPE-01) and reference_clip (VF-REFCLIP-01): the pack holds the model, the add-on and every word; the caller names none.
// VF-SWAP-01: what a swap replaces: the inner face only, the whole head, or the whole person. Left out, the Stack picks the pack's default. The Stack decides which
// route serves each kind; the caller never names a model.
export const StackSwapKind = z.enum(["face", "head", "person"]);
export const StackVideoOperation = z.enum(["retake_from", "extend", "enhance", "clip_film_shot", "restyle", "companion_take", "reference_clip"]);
// VF-ROUTE-01: the way the Stack holds a clip's pictures, chosen by the Stack from the serving pack's capability rows (never by the caller): from words alone, from a
// start picture (alone or with an end picture), or from identity reference pictures. `route_reason` is one plain line saying why.
export const StackClipRoute = z.enum(["words", "start_picture", "start_end_pictures", "references"]);
export const StackClipInput = z.object({ role: StackClipInputRole, file: text }).strict();
export const StackClipDialogue = z.object({ speaker: text, text, language: text.optional() }).strict();

export const StackMakeRequest = z.discriminatedUnion("job", [
  req("picture", { inputs: z.array(StackClipInput).optional(), intent: StackClipIntent.optional(), description: text, words: text.optional(), shape: StackJobShape, level: StackJobLevel, count: z.number().int().min(1).optional(), styles: z.array(text).optional(), seed: z.number().int().optional() }),
  req("picture_edit", { picture: text, description: text, words: text.optional(), references: z.array(text).optional(), mask: text.optional(), level: StackJobLevel, styles: z.array(text).optional() }),
  // VF-TAKES-01: `operation` asks for a retake from `at_seconds` or an extension by `seconds` of the clip in the `edit_source` input; `take_of` is the job id of the first take when this is another take of it (same route and recipe, a new seed).
  req("clip", { operation: StackVideoOperation.optional(), style_strength: z.number().min(0).max(2).optional(), conditioning: z.enum(["source", "edges"]).optional(), loop: z.boolean().optional(), rating: z.enum(["G", "PG-13"]).optional(), at_seconds: z.number().min(0).optional(), take_of: text.optional(), description: text, shape: StackJobShape, level: StackJobLevel, seconds: secs, start_picture: text.optional(), end_picture: text.optional(), styles: z.array(text).optional(), seed: z.number().int().optional(), inputs: z.array(StackClipInput).optional(), dialogue: z.array(StackClipDialogue).optional(), intent: StackClipIntent.optional(), look: text.optional(), quiet_seconds: z.number().int().min(20).max(3600).optional(), quiet_max_wait_seconds: z.number().int().min(0).max(86400).nullable().optional() }),
  req("clip_from_sheet", { sheet: text, description: text, shape: StackJobShape, level: StackJobLevel, seconds: secs }),
  req("restyle", { clip: text, restyle: text, description: text.optional() }),
  req("swap", { clip: text, references: z.array(text).min(1), kind: StackSwapKind.optional(), description: text.optional(), start_seconds: z.number().min(0).optional(), seconds: secs, level: StackJobLevel }),
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

// `receipt` (VF-RECEIPT-01): the job id the owner's route answers for the job's StackVideoReceipt. Optional: only video jobs write one.
export const StackMadeWith = z.object({ part: StackPartId, label: text, pack_version: text, shape: StackJobShape.nullable(), seconds: z.number().min(0).nullable(), sound: z.boolean(), notes: z.array(text), receipt: text.optional(), route: StackClipRoute.optional(), route_reason: text.optional() }).strict();
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
  // VF-ROUTE-01: `needs_start_picture` means the serving pack holds a person only through a first picture: the caller makes one from the identity picture and sends it as `start_picture`.
  // VF-CAPS-01: an input combination the serving pack cannot take, and a model or adapter the job needs that is not installed.
  // VF-ROUTE-DERIVE-01: the typed answer that says what the first picture must be: its shape and which of the request's input roles to make it from. One derivation per request.
  z.object({ code: z.literal("needs_start_picture"), line: text, shape: StackJobShape, inputs: z.array(StackClipInputRole).min(1) }).strict(),
  z.object({ code: z.enum(["shape_not_served", "level_not_served", "input_not_supported", "not_installed", "needs_start_picture"]), line: text }).strict(),
  z.object({ code: z.literal("not_on_this_model"), line: text, alternatives: z.array(z.object({ part: StackPartId, label: text }).strict()) }).strict(),
]);
export type StackMakeRefusal = z.infer<typeof StackMakeRefusal>;
