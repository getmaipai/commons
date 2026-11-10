// Numeric values ported from Home's companion demo app.js (2026-11-10).
// Existing cue values are consumed by cues.ts; additions name the source function.
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
// NOM: detectEvents text prior and vocal animation fallback.
export const NOM: Record<string, number> = {
  laugh: 1, chuckle: 0.6, cough: 0.5, sigh: 0.9, gasp: 0.5, "clear throat": 0.7,
};
// Maximum audio-run duration in detectEvents (seconds).
export const TAG_MAX_SECONDS: Record<string, number> = {
  laugh: 1.6, chuckle: 1, cough: 0.9, sigh: 1.3, gasp: 0.8, "clear throat": 1,
};
export const TAG_PRIORS = NOM;
// planFx and planMicro constants.
export const GAZE_MIN_SECONDS = 6;
export const GAZE_MAX_SECONDS = 12;
// Research-specified speaking blink schedule: 15-25/min, prefer phrase pauses, force within 6 s.
export const BLINK_RATE_PER_SECOND = 0.33;
export const BLINK_MIN_INTERVAL_SECONDS = 0.6;
export const BLINK_MAX_INTERVAL_SECONDS = 6;
export const BLINK_DURATION_SECONDS = 0.3;
export const BLINK_DOWN_SECONDS = 0.12;
export const BLINK_PAUSE_SNAP_SECONDS = 0.35;
export const LIFE_JITTER = 0.3;
export const LIFE_PROFILE = { brow: [0.1, 0.12, 0.28], nod: [0.5, 0.05, 0.5], tilt: [0.4, 0.5, 0.6] } as const;
export const MICRO = {
  brow: 2, corner: 0.45, asym: 0.6, upper: 0.55, press: 0.5,
  nostril: 0.8, wrinkle: 0.5,
} as const;
export const MICRO_RATE = { brow: 0.3, corner: 0.35, asym: 0.12, wrinkle: 0.15 } as const;
export const MICRO_SCALE = 1.2;
export const MICRO_DECOLLISION_SECONDS = 0.12;
export const MICRO_DECOLLISION_SHIFT = 0.18;
export const MICRO_DECOLLISION_PROBABILITY = 0.75;
export const SHOUT_GAIN = 3;
export const SHOUT_BRIGHTNESS = 0.7;
export const SHOUT_LIMIT = 0.92;
export const SHOUT_LOW_PASS = 0.48;
// audioFeatures/detectEvents constants.
export const AUDIO_WINDOW_SECONDS = 0.032;
export const AUDIO_F0_MIN = 70;
export const AUDIO_F0_MAX = 400;
export const AUDIO_HARMONICITY_CUTOFF = 0.55;
export const AUDIO_NOISE_FLOOR = 0.002;
export const EVENT_PRIOR_WINDOW_SECONDS = 0.6;
export const EVENT_GAP_FRAMES = 4;
export const EVENT_MIN_FRAMES = 12;
export const VOCAL_PRE_ROLL = 0.05;
export const VOCAL_POST_ROLL = 0.12;
export const GASP_POST_ROLL = 0.4;
export const VOCAL_MOUTH_SHAPES = "ABCDEFGH";
export const TAG_RE_SOURCE = "\\[(laugh|chuckle|cough|sigh|clear throat|gasp)\\]";
// buildSegments loud mouth promotion thresholds.
export const LOUD_PROMOTE_START = 0.35;
export const LOUD_PROMOTE_STEP = 0.5;
export const LOUD_PROMOTE_WIDE = 0.8;
export const LOUD_PROMOTE_H = 0.55;
// planFx/planMicro timing and amplitudes.
export const FX_ENV_FLOOR = 0.85;
export const FX_PEAK_FLOOR = 0.4;
export const FX_PEAK_SKIP = 0.4;
export const FX_NOD_START = 0.6;
export const FX_POSE_ROLL = 0.4;
export const FX_POSE_BROW = 0.19;
export const FX_POSE_TILT = 0.23;
export const FX_BROW_LEAD = 0.06;
export const FX_NOD_LAG = 0.06;
export const FX_GAZE_START = 1.2;
export const FX_GAZE_END_MARGIN = 0.8;
export const PAUSE_SNAP_GAP = 0.22;
export const PAUSE_SNAP_RADIUS = 1.2;
export const PAUSE_SNAP_MIN = 1.2;
export const FX_POISSON_JITTER_LOW = 0.6;
export const FX_POISSON_JITTER_SPAN = 0.8;
export const FX_MICRO_START = { brow: 0.4, corner: 0.3, asym: 0.5, wrinkle: 0.6 } as const;
export const FX_MICRO_END_MARGIN = 0.4;
export const FX_MICRO_END = { corner: 0.3, asym: 0.3 } as const;
// LIFE profile fallbacks and per-character values are arguments to planLife.
export const LIFE_LOUD_DEFAULTS = {
  brow: 1, nodCap: 1.4, tiltCap: 0.9, shoulderPct: 0.01,
} as const;
export const LIFE_CHARACTER = {
  man: { eyeWide: 0.18, browShout: 1, nodCap: 0.75, shoulderPct: 0.01, eyeGain: { squint: 1.3, closed: 2, half: 2.6, wide: 0 },
    vocal: { back: 0.75, dip: 0.8 } },
  clay: { eyeWide: 0.15, browShout: 1.3, nodCap: 1.4, shoulderPct: 0.01, eyeGain: { squint: 0.7, closed: 0.7, half: 0.8, wide: 0.9 },
    vocal: { back: 1, dip: 1 } },
  pixar: { eyeWide: 0.3, browShout: 1.4, nodCap: 1.4, shoulderPct: 0.01, eyeGain: { squint: 0.55, closed: 0.55, half: 0.6, wide: 0 },
    vocal: { back: 1, dip: 1 } },
} as const;
export const EMO_WORDS: Record<string, RegExp> = {
  angry: /\b(stop|get out|shut up|enough|how dare|hate|damn|idiot|furious|angry|leave me|back off|don't you|mad)\b/i,
  excited: /\b(yes|wow|awesome|amazing|great|congrat|love|won|finally|hooray|yay|fantastic|let's go|incredible)\b/i,
  alarmed: /\b(help|look out|watch out|run|fire|danger|oh no|careful|behind you|quick|hurry|no no|emergency)\b/i,
  sad: /\b(sorry|miss you|please|cry|sad|lost|gone|alone|wish|goodbye)\b/i,
};
