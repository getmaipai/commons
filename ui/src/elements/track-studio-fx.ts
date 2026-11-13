// MP-03: the audio studio's effects and its time-range selection. Pure data and math, no DOM. The six-band EQ and the compressor are what the
// browser preview plays (track-studio-engine.ts, Web Audio BiquadFilter and DynamicsCompressor, listening only); the host decides what Apply
// does with them (MP-04 writes a new version on the server). A selection is a range in seconds the host runs an effect on.

export const EQ_BANDS_HZ = [60, 170, 500, 1500, 5000, 12000] as const;
export const EQ_GAIN_MIN_DB = -12;
export const EQ_GAIN_MAX_DB = 12;

export interface CompressorSettings {
  /** dB at which compression starts. */
  threshold_db: number;
  /** Compression ratio, N:1. */
  ratio: number;
  attack_ms: number;
  release_ms: number;
  /** Make-up gain in dB, applied after compression. */
  makeup_db: number;
}

export interface StudioEffects {
  /** Gain in dB for each band of `EQ_BANDS_HZ`, in order. */
  eq: number[];
  compressor: CompressorSettings;
}

export const COMPRESSOR_LIMITS = {
  threshold_db: { min: -60, max: 0, step: 1 },
  ratio: { min: 1, max: 20, step: 0.5 },
  attack_ms: { min: 1, max: 200, step: 1 },
  release_ms: { min: 10, max: 1000, step: 10 },
  makeup_db: { min: 0, max: 24, step: 0.5 },
} as const;

export const defaultCompressor = (): CompressorSettings => ({ threshold_db: 0, ratio: 1, attack_ms: 10, release_ms: 100, makeup_db: 0 });
export const defaultEffects = (): StudioEffects => ({ eq: EQ_BANDS_HZ.map(() => 0), compressor: defaultCompressor() });

const clampN = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Effects from a host value: missing or bad fields fall back to flat (0 dB EQ, 1:1 compressor), values are clamped. */
export function readEffects(raw: unknown): StudioEffects {
  const base = defaultEffects();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as { eq?: unknown; compressor?: Record<string, unknown> };
  const eq = EQ_BANDS_HZ.map((_, i) => clampN(num(Array.isArray(r.eq) ? r.eq[i] : 0, 0), EQ_GAIN_MIN_DB, EQ_GAIN_MAX_DB));
  const c = r.compressor && typeof r.compressor === "object" ? r.compressor : {};
  const L = COMPRESSOR_LIMITS;
  const d = base.compressor;
  return {
    eq,
    compressor: {
      threshold_db: clampN(num(c.threshold_db, d.threshold_db), L.threshold_db.min, L.threshold_db.max),
      ratio: clampN(num(c.ratio, d.ratio), L.ratio.min, L.ratio.max),
      attack_ms: clampN(num(c.attack_ms, d.attack_ms), L.attack_ms.min, L.attack_ms.max),
      release_ms: clampN(num(c.release_ms, d.release_ms), L.release_ms.min, L.release_ms.max),
      makeup_db: clampN(num(c.makeup_db, d.makeup_db), L.makeup_db.min, L.makeup_db.max),
    },
  };
}

export const eqIsFlat = (eq: readonly number[]): boolean => eq.every((g) => Math.abs(g) < 1e-9);
/** A compressor at ratio 1 with no make-up gain changes nothing. */
export const compressorIsNeutral = (c: CompressorSettings): boolean => c.ratio <= 1 && Math.abs(c.makeup_db) < 1e-9;
export const effectsAreNeutral = (fx: StudioEffects): boolean => eqIsFlat(fx.eq) && compressorIsNeutral(fx.compressor);

export function setEqBand(fx: StudioEffects, band: number, db: number): StudioEffects {
  if (band < 0 || band >= EQ_BANDS_HZ.length) return fx;
  const eq = fx.eq.slice();
  eq[band] = Math.round(clampN(db, EQ_GAIN_MIN_DB, EQ_GAIN_MAX_DB) * 2) / 2;
  return { ...fx, eq };
}
export function setCompressor(fx: StudioEffects, patch: Partial<CompressorSettings>): StudioEffects {
  return readEffects({ eq: fx.eq, compressor: { ...fx.compressor, ...patch } });
}
export const resetEq = (fx: StudioEffects): StudioEffects => ({ ...fx, eq: EQ_BANDS_HZ.map(() => 0) });
export const resetCompressor = (fx: StudioEffects): StudioEffects => ({ ...fx, compressor: defaultCompressor() });

/** "60 Hz", "1.5 kHz". */
export const bandText = (hz: number): string => (hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`);

// ---------------------------------------------------------------------------------------------------------------------
// The time-range selection

export interface StudioSelection { start_s: number; end_s: number }
/** The smallest range worth keeping: a drag that ends closer than this is a click, and clears. */
export const MIN_SELECTION_S = 0.05;

/** A range from two times, ordered and clamped to 0..length. Null when it is shorter than the minimum or the length is zero. */
export function makeSelection(a: number, b: number, length: number): StudioSelection | null {
  const lo = clampN(Math.min(a, b), 0, Math.max(0, length));
  const hi = clampN(Math.max(a, b), 0, Math.max(0, length));
  if (hi - lo < MIN_SELECTION_S) return null;
  return { start_s: Math.round(lo * 1000) / 1000, end_s: Math.round(hi * 1000) / 1000 };
}
/** A host value read back: a finite ordered range inside 0..length, else null. */
export function readSelection(raw: unknown, length: number): StudioSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { start_s?: unknown; end_s?: unknown };
  if (typeof r.start_s !== "number" || typeof r.end_s !== "number" || !Number.isFinite(r.start_s) || !Number.isFinite(r.end_s)) return null;
  return makeSelection(r.start_s, r.end_s, length);
}
