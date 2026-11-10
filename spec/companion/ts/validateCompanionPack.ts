import type { CompanionPack } from "../../gen/ts/companion-pack.js";

export type CompanionPackFiles = Readonly<Record<string, number>>;

/** Plain-words checks that depend on relationships across a pack's fields. */
export function validateCompanionPack(pack: CompanionPack, files?: CompanionPackFiles): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();

  for (const [state, clips] of Object.entries(pack.states)) {
    const fps = clips.map((clip) => clip.fps);
    const paths = new Set<string>();
    if (fps.length > 1 && Math.max(...fps) - Math.min(...fps) > 1) {
      problems.push(`states.${state} clips must use frame rates within 1 fps; make the clips match.`);
    }
    for (const [index, clip] of clips.entries()) {
      const field = `states.${state}[${index}]`;
      if (ids.has(clip.id)) problems.push(`${field}.id repeats clip id ${clip.id}; give every clip a unique id.`);
      ids.add(clip.id);
      if (paths.has(clip.file)) problems.push(`${field}.file repeats a file in states.${state}; give each clip in a state its own file.`);
      paths.add(clip.file);
      if (clip.file.toLowerCase().endsWith(".webm")) problems.push(`${field}.file uses WebM; use an .mp4 stacked-alpha H.264 clip.`);
      if (!clip.trackFile.endsWith(".json")) problems.push(`${field}.trackFile must end in .json; use the track sidecar filename.`);
      if (clip.phone && !clip.phone.endsWith(".mp4")) problems.push(`${field}.phone must end in .mp4; use the phone clip filename.`);
      if (clip.track.length !== clip.frames) problems.push(`${field}.track has ${clip.track.length} values but frames is ${clip.frames}; make the track length equal frames.`);
      if (clip.rest.first < 0 || clip.rest.first >= clip.frames) problems.push(`${field}.rest.first is outside [0, frames); choose a frame from 0 through ${clip.frames - 1}.`);
      if (clip.rest.last < 0 || clip.rest.last >= clip.frames) problems.push(`${field}.rest.last is outside [0, frames); choose a frame from 0 through ${clip.frames - 1}.`);
      if (files && clip.phone && !(clip.phone in files)) problems.push(`${field}.phone has no matching file in files; include the phone twin.`);
    }
  }

  if (pack.states.idle.length < 2) problems.push("states.idle needs at least 2 clips; add another idle clip.");
  const dirs = [pack.mouth.calm.dir, ...(pack.mouth.shout ? [pack.mouth.shout.dir] : []), pack.head.dir, pack.eyes.dir, pack.emotion.dir];
  if (files) for (const dir of dirs) {
    if (!(`${dir}/meta.json` in files)) problems.push(`${dir} needs meta.json; include the directory metadata file.`);
  }
  if (files) {
    const desktop = Object.entries(files).filter(([path]) => !path.endsWith(".phone.mp4") && path !== "build-report.json");
    const total = desktop.reduce((sum, [, size]) => sum + size, 0);
    if (total > pack.budget.bytes) problems.push(`budget.bytes is ${pack.budget.bytes} but desktop files total ${total} bytes; raise the budget or reduce file sizes.`);
    if (pack.tile.desktop === 480 && total > 12582912) problems.push(`budget.bytes desktop files total ${total} bytes, over the desktop limit of 12582912; reduce file sizes.`);
    for (const [asset, encoding] of [[pack.mouth.calm.dir, pack.mouth.flowEncoding], [pack.head.dir, pack.head.flowEncoding], [pack.emotion.dir, pack.emotion.flowEncoding]] as const) {
      const flows = Object.keys(files).filter((path) => path.startsWith(`${asset}/`) && (path.endsWith(".flow.bin") || path.endsWith(".flow.bin.z")));
      if (encoding === "int16-deflate" && flows.some((path) => !path.endsWith(".z"))) problems.push(`${asset} uses int16-deflate but a flow file lacks .z; match the encoding to the file extension.`);
      if (encoding !== "int16-deflate" && flows.some((path) => path.endsWith(".z"))) problems.push(`${asset} uses int16 but a flow file ends in .z; match the encoding to the file extension.`);
    }
  }
  return problems;
}
