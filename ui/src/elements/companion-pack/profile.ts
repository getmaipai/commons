/** Per-character render settings the demo kept in its characters.json (highlight ceiling, blur, stop-motion, shoulder band). */
export type RenderProfile = {
  /** Highlight ceiling for the pasted mouth interior (compressed above it). */
  hi: number;
  /** Blur in canvas px at 480 for the pasted interior (ignored where the browser has no canvas filter). */
  blur: number;
  /** Stop-motion tick rate in frames per second; 0 is smooth. */
  cadence: number;
  /** G and H shapes fold to B and C (the photo man has no teeth-on-lip shapes). */
  dropGH: boolean;
  /** Round-vowel transitions start a whole window early instead of half. */
  early: boolean;
  /** Looser segment merging (the cartoons). */
  loose: boolean;
  /** Eyelid picture brightness lift. */
  eyeLift: number;
  /** Canvas px at 480: the shoulder shift ramps from 0 at the first value to 1 at the second. */
  shoulderBand: [number, number];
};
export const RENDER_PROFILES: Record<string, RenderProfile> = {
  man: { hi: 205, blur: 0.6, cadence: 0, dropGH: true, early: true, loose: false, eyeLift: 0, shoulderBand: [335, 365] },
  clay: { hi: 215, blur: 1, cadence: 12, dropGH: false, early: false, loose: true, eyeLift: 22, shoulderBand: [385, 412] },
  pixar: { hi: 235, blur: 0.8, cadence: 0, dropGH: false, early: false, loose: true, eyeLift: 0, shoulderBand: [364, 392] },
};
export const DEFAULT_PROFILE: RenderProfile = RENDER_PROFILES.pixar!;
export const profileFor = (id: string | undefined, override?: Partial<RenderProfile>): RenderProfile =>
  ({ ...(RENDER_PROFILES[id ?? ""] ?? DEFAULT_PROFILE), ...override });
