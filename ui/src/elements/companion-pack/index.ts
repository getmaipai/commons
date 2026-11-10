export { buildCues, joinCues, provisionalCues } from "./cues";
export type { Cue, MouthLetter, PhonesFor } from "./cues";
export { buildLoud, loudAt, loudMean, promoteLoud, shoutGain } from "./loud";
export { activeVocal, audioFeatures, detectEvents, hasTaggedSigh, mixSlot, splitTags, vocalMouth } from "./tags";
export type { AudioFeatures, EventWindow, MorphMix, MouthMix, VocalTag } from "./tags";
export { emotionFor, emotionKind, LIFE, LIFE_CHARACTER_PROFILE, lifeAt, planBlinks, planFx, planInhales, planLife, planMicro, PROFILE } from "./life";
export type { BlinkEvent, LifeEvent, LifePlan, LifeProfile, MicroEvent, MicroPose } from "./life";
