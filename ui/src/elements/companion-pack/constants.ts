// Values and behavior thresholds are from Home's companion-pack demo app.js
// (2026-11-10) and data-scratch/poc-companions/RESEARCH-speech-motion.md.
export const FRAME_SECONDS = 0.01;
export const ENVELOPE_SMOOTH_FRAMES = 1;
export const UNIT_S = 0.14;
export const WORD_GAP_WEIGHT = 0.6;
export const VOICED_FLOOR = 0.08;
export const VALLEY_RADIUS_FRAMES = 9;
export const VALLEY_MARGIN_FRAMES = 6;
export const FAST_VOWELS_PER_SECOND = 4.2;
export const FAST_SCALE = 0.6;
export const FAST_TRANSITION_SECONDS = 0.07;
export const NORMAL_TRANSITION_SECONDS = 0.12;
export const WEAK_HOLD_SECONDS = 0.15;
export const SEGMENT_MERGE_SECONDS = 0.14;
export const SOFT_MERGE_SECONDS = 0.22;
export const MBP_MERGE_SECONDS = 0.07;
export const PAUSE_CLOSE_SECONDS = 0.15;
export const D_PERCENTILE = 0.75;
export const D_REPEAT_SECONDS = 0.7;
export const LOUD_ATTACK_SECONDS = 0.06;
export const LOUD_RELEASE_SECONDS = 0.25;
export const TAG_PRIORS: Record<string, number> = {
  laugh: 1, chuckle: 0.6, cough: 0.5, sigh: 0.9, gasp: 0.5, "clear throat": 0.7,
};
export const TAG_MAX_SECONDS: Record<string, number> = {
  laugh: 1.6, chuckle: 1, cough: 0.9, sigh: 1.3, gasp: 0.8, "clear throat": 1,
};
export const GAZE_MIN_SECONDS = 6;
export const GAZE_MAX_SECONDS = 12;
export const LIFE_JITTER = 0.3;
