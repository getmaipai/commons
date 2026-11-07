import type { CSSProperties } from "react";
import { i18n } from "@/kit/i18n"

function phaseLabel(phase: string): string {
  switch (phase) {
    case "New Moon": return i18n._({ id: "ui.New Moon", message: "New Moon" })
    case "Waxing Crescent": return i18n._({ id: "ui.Waxing Crescent", message: "Waxing Crescent" })
    case "First Quarter": return i18n._({ id: "ui.First Quarter", message: "First Quarter" })
    case "Waxing Gibbous": return i18n._({ id: "ui.Waxing Gibbous", message: "Waxing Gibbous" })
    case "Full Moon": return i18n._({ id: "ui.Full Moon", message: "Full Moon" })
    case "Waning Gibbous": return i18n._({ id: "ui.Waning Gibbous", message: "Waning Gibbous" })
    case "Last Quarter": return i18n._({ id: "ui.Last Quarter", message: "Last Quarter" })
    case "Waning Crescent": return i18n._({ id: "ui.Waning Crescent", message: "Waning Crescent" })
    default: return phase
  }
}

export function MoonDisc({ phase, illumination, size }: { phase: string; illumination: number; size: number }) {
  const lit = Math.max(0, Math.min(100, Number.isFinite(illumination) ? illumination : 0));
  const known = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"].includes(phase);
  const waxing = known && (phase.startsWith("Waxing") || phase === "First Quarter" || phase === "New Moon");
  // Map illumination onto the lunar cycle, then use its cosine for the terminator ellipse.
  const arc = Math.acos(1 - 2 * lit / 100) / (2 * Math.PI);
  const p = waxing ? arc : 1 - arc;
  const k = Math.cos(2 * Math.PI * p);
  const rx = Math.abs(k) * 45;
  const sidePath = waxing ? "M50 5 A45 45 0 0 1 50 95 Z" : "M50 5 A45 45 0 0 0 50 95 Z";
  const litSide = waxing ? "right" : "left";
  const litFill = "var(--weather-moon-lit)";
  const darkFill = "var(--weather-moon-dark)";
  const style = { "--moon-glow": "var(--weather-moon-glow)" } as CSSProperties;
  return <svg data-slot="weather-moon-disk" data-lit-side={litSide} data-phase-extreme={lit === 100 ? "full" : lit === 0 ? "new" : undefined} viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={i18n._({ id: "ui.{phaseName}, {lit}% illuminated", message: "{phaseName}, {lit}% illuminated", values: { phaseName: phaseLabel(phase), lit } })} style={style}>
    <circle cx="50" cy="50" r="45" fill={darkFill} />
    {lit > 0 && lit < 100 && <path data-lit-path={litSide} d={sidePath} fill={litFill} />}
    {lit > 0 && lit < 100 && <ellipse cx="50" cy="50" rx={rx} ry="45" fill={k < 0 ? litFill : darkFill} />}
    {lit === 100 && <circle cx="50" cy="50" r="45" fill={litFill} />}
  </svg>;
}
