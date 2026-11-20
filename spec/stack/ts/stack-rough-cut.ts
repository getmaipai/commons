// Hand-written Zod mirror of ../schemas/stack-rough-cut-request.schema.json and stack-rough-cut-result.schema.json.
// VF-ROUGHCUT-01 (architect MEDIA-ROUGH-CUT-01): the Stack media job `media.rough_cut`. One still per shot at its real length with its
// motion, each spoken line voiced, joined into one file. The result is also the shape the kit storyboard_player block plays.
// Home picks the voices (the household voice record is Home's) and sends a voice address or none; the Stack renders them, makes no new
// voice, and refuses a clone address for a speaker flagged `minor`. No estimate or memory figure travels either way (E4), and no engine or
// model name travels in the request.
import { z } from "zod";

import { StackClipDialogue } from "./stack-make";
import { StackJobAudience } from "./stack-model-pack";

const text = z.string().min(1);
const id = z.string().min(1).max(60).regex(/^[A-Za-z0-9._-]+$/);

export const StackRoughCutShot = z.object({ id, picture: text, seconds: z.number().positive().max(60), motion: text.optional(), caption: z.string().min(1).max(200).optional() }).strict();
// A line names its shot by wrapping the spec's dialogue shape, never by copying its fields.
export const StackRoughCutLine = z.object({ shot_id: id, line: StackClipDialogue }).strict();
export const StackRoughCutVoice = z.object({ speaker: text, voice_address: text.optional(), minor: z.boolean().optional() }).strict();

export const StackRoughCutRequest = z.object({
  audience: StackJobAudience,
  shots: z.array(StackRoughCutShot).min(1).max(24),
  lines: z.array(StackRoughCutLine).max(96).optional(),
  voices: z.array(StackRoughCutVoice).max(24).optional(),
}).strict();
export type StackRoughCutRequest = z.infer<typeof StackRoughCutRequest>;

export const StackRoughCutResult = z.object({
  file: text,
  total_s: z.number().min(0),
  shots: z.array(z.object({ id, start_s: z.number().min(0), end_s: z.number().min(0) }).strict()).min(1),
  lines: z.array(z.object({ shot_id: id, speaker: text, start_s: z.number().min(0), length_s: z.number().positive(), audio: text, wave: z.array(z.number().min(0).max(1)).min(1).max(200).optional() }).strict()),
}).strict();
export type StackRoughCutResult = z.infer<typeof StackRoughCutResult>;

/**
 * The rows the kit `storyboard_player` block plays (ui/schema.json `storyboard_shot_row`), made from a rough-cut result. Home calls this when it
 * serves the block's data: `captions`, `stills` and `lineTexts` are Home's own (the plan's shot text, the stored picture addresses and the lines it sent), so the result itself
 * carries none of them. `duration_sec` is the shot's length on the file's clock, `line_start_sec` is seconds after the start of the SHOT (the result's
 * line start is on the file's clock). A shot without a picture address is `no_picture`.
 */
export function roughCutShotRows(
  result: StackRoughCutResult,
  own: { captions: Readonly<Record<string, string>>; stills: Readonly<Record<string, string>>; /** The text of each line by shot id: Home has it (it sent the dialogue); the result does not repeat it. */ lineTexts: Readonly<Record<string, string>> },
): Array<{ shot_id: string; caption: string; duration_sec: number; still: string | null; clip: null; status: "ready" | "no_picture"; line_speaker: string | null; line_text: string | null; line_start_sec: number | null; line_audio: string | null; line_wave: number[] | null }> {
  return result.shots.map((shot) => {
    const line = result.lines.find((entry) => entry.shot_id === shot.id);
    const still = own.stills[shot.id] ?? null;
    return {
      shot_id: shot.id, caption: own.captions[shot.id] ?? "", duration_sec: Math.round((shot.end_s - shot.start_s) * 1000) / 1000,
      still, clip: null, status: still ? "ready" : "no_picture",
      line_speaker: line?.speaker ?? null, line_text: line ? own.lineTexts[shot.id] ?? null : null,
      line_start_sec: line ? Math.round((line.start_s - shot.start_s) * 1000) / 1000 : null, line_audio: line?.audio ?? null, line_wave: line?.wave ?? null,
    };
  });
}
