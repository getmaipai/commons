import type { CompanionPack } from "../../gen/ts/companion-pack.js";

export type CompanionPackFiles = Readonly<Record<string, number>>;

/** Plain-words checks that depend on relationships across a pack's fields. */
export function validateCompanionPack(pack: CompanionPack, files?: CompanionPackFiles): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();

  for (const [state, clips] of Object.entries(pack.states)) {
    const fps = clips.map((clip) => clip.fps);
    if (fps.length > 1 && Math.max(...fps) - Math.min(...fps) > 1) {
      problems.push(`states.${state} clips must use frame rates within 1 fps; make the clips match.`);
    }
    for (const [index, clip] of clips.entries()) {
      const field = `states.${state}[${index}]`;
      if (ids.has(clip.id)) problems.push(`${field}.id repeats clip id ${clip.id}; give every clip a unique id.`);
      ids.add(clip.id);
      if (clip.file.toLowerCase().endsWith(".webm")) problems.push(`${field}.file uses WebM; use an .mp4 stacked-alpha H.264 clip.`);
      if (clip.track.length !== clip.frames) {
        problems.push(`${field}.track has ${clip.track.length} values but frames is ${clip.frames}; make the track length equal frames.`);
      }
      if (clip.rest.first < 0 || clip.rest.first >= clip.frames) {
        problems.push(`${field}.rest.first is outside [0, frames); choose a frame from 0 through ${clip.frames - 1}.`);
      }
      if (clip.rest.last < 0 || clip.rest.last >= clip.frames) {
        problems.push(`${field}.rest.last is outside [0, frames); choose a frame from 0 through ${clip.frames - 1}.`);
      }
    }
  }

  if (pack.states.idle.length < 2) {
    problems.push("states.idle needs at least 2 clips; add another idle clip.");
  }
  if (pack.mouth.letters.wide === undefined) problems.push("mouth.letters.wide is missing; add the wide shape index used by the atlas.");
  for (const [kind, emotion] of Object.entries(pack.emotion)) {
    if (!emotion.flow || !emotion.residual) problems.push(`emotion.${kind} needs both flow and residual files; add both filenames.`);
  }
  if (files) {
    const total = Object.values(files).reduce((sum, size) => sum + size, 0);
    if (total > pack.budget.bytes) problems.push(`budget.bytes is ${pack.budget.bytes} but files total ${total} bytes; raise the budget or reduce file sizes.`);
    if (total > 12582912 && pack.tile.desktop === 480) {
      problems.push(`budget.bytes files total ${total} bytes, over the desktop limit of 12582912; reduce file sizes.`);
    }
  }
  return problems;
}
