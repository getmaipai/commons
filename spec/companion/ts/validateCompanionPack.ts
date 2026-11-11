import type { CompanionPack } from "../../gen/ts/companion-pack.js";

export type CompanionPackFiles = Readonly<Record<string, number>>;

/** Plain-words checks that depend on relationships across a pack's fields. */
export function validateCompanionPack(pack: CompanionPack, files?: CompanionPackFiles): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();

  if (pack.source) {
    const { x0, size } = pack.source;
    if (!Number.isFinite(x0) || x0 < 0) problems.push("source.x0 must be a number of 0 or more; use the left edge of the tile in the layer frame.");
    if (!Number.isFinite(size) || size <= 0) problems.push("source.size must be a number above 0; use the side of the square tile in the layer frame.");
  }
  const stillPlusParts = Boolean(pack.voice);
  if (!stillPlusParts) {
    for (const field of ["states", "mouth", "emotion", "life"] as const) {
      if (!pack[field]) problems.push(`${field} is required unless the pack has a voice layer; add ${field} or add a voice layer with parts.`);
    }
  }
  if (pack.voice) problems.push(...validateVoice(pack, files));

  for (const [state, clips] of Object.entries(pack.states ?? {})) {
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

  if (pack.states && pack.states.idle.length < 2) problems.push("states.idle needs at least 2 clips; add another idle clip.");
  const dirs = [...(pack.mouth ? [pack.mouth.calm.dir] : []), ...(pack.mouth?.shout ? [pack.mouth.shout.dir] : []), ...(pack.head ? [pack.head.dir] : []), ...(pack.eyes ? [pack.eyes.dir] : []), ...(pack.emotion ? [pack.emotion.dir] : [])];
  if (files) for (const dir of dirs) {
    if (!(`${dir}/meta.json` in files)) problems.push(`${dir} needs meta.json; include the directory metadata file.`);
  }
  if (files) {
    const desktop = Object.entries(files).filter(([path]) => !path.endsWith(".phone.mp4") && path !== "build-report.json");
    const total = desktop.reduce((sum, [, size]) => sum + size, 0);
    if (total > pack.budget.bytes) problems.push(`budget.bytes is ${pack.budget.bytes} but desktop files total ${total} bytes; raise the budget or reduce file sizes.`);
    if (pack.tile.desktop === 480 && total > 12582912) problems.push(`budget.bytes desktop files total ${total} bytes, over the desktop limit of 12582912; reduce file sizes.`);
    for (const [asset, encoding] of [...(pack.mouth ? [[pack.mouth.calm.dir, pack.mouth.flowEncoding] as const] : []), ...(pack.head ? [[pack.head.dir, pack.head.flowEncoding] as const] : []), ...(pack.emotion ? [[pack.emotion.dir, pack.emotion.flowEncoding] as const] : [])]) {
      const flows = Object.keys(files).filter((path) => path.startsWith(`${asset}/`) && (path.endsWith(".flow.bin") || path.endsWith(".flow.bin.z")));
      if (encoding === "int16-deflate" && flows.some((path) => !path.endsWith(".z"))) problems.push(`${asset} uses int16-deflate but a flow file lacks .z; match the encoding to the file extension.`);
      if (encoding !== "int16-deflate" && flows.some((path) => path.endsWith(".z"))) problems.push(`${asset} uses int16 but a flow file ends in .z; match the encoding to the file extension.`);
    }
  }
  return problems;
}

/** MAKER-G: checks across the fields of a voice layer (reactive parts over a still picture). */
function validateVoice(pack: CompanionPack, files?: CompanionPackFiles): string[] {
  const problems: string[] = [];
  const voice = pack.voice!;
  const tile = pack.tile.desktop ?? 480;
  const ids = new Set<string>();
  if (files && voice.base && !(voice.base in files)) problems.push(`voice.base names ${voice.base}, which is not in files; include the picture.`);
  for (const [index, part] of voice.parts.entries()) {
    const field = `voice.parts[${index}]`;
    if (ids.has(part.id)) problems.push(`${field}.id repeats part id ${part.id}; give every part a unique id.`);
    ids.add(part.id);
    if (files && !(part.file in files)) problems.push(`${field}.file names ${part.file}, which is not in files; include the picture.`);
    const { x, y, w, h } = part.box;
    if (x < 0 || y < 0 || x + w > tile || y + h > tile) problems.push(`${field}.box leaves the ${tile} pixel tile; move or shrink the box.`);
    for (const [e, effect] of part.effects.entries()) {
      const at = `${field}.effects[${e}]`;
      if ((effect.curve === "pulse" || effect.curve === "blink") && effect.channel !== "state") problems.push(`${at} uses the ${effect.curve} curve, which only works on the state channel; set channel to state.`);
      if (effect.channel === "state" && !effect.drive) problems.push(`${at} uses the state channel without drive; add a drive for the states it should follow.`);
      if (effect.channel !== "state" && effect.drive) problems.push(`${at} has drive but its channel is ${effect.channel}; drive only applies to the state channel.`);
      if (effect.glow && !part.glow) problems.push(`${at} drives glow but the part has no glow colour; add glow.color to ${field}.`);
      const moves = effect.scale || effect.scaleX || effect.scaleY || effect.rotate || effect.translate || effect.opacity || effect.brightness || effect.glow;
      if (!moves) problems.push(`${at} changes nothing; add scale, rotate, translate, opacity, brightness or glow.`);
    }
  }
  return problems;
}
