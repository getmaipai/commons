import { statusDotClass, statusFor, type StatusKind } from "@/kit/status";
import { cn, hueTextColor, hueTintBackground } from "@/kit/utils";

// Never rely on hue alone (spec section 4): the label is always present
// text, the dot is decoration.
//
// Spec section 1 ("Pills and badges"): tinted with the status color at
// 15% and text in the color - a raw hue text on that 15% tint fails
// 4.5:1 for every named hue in light theme (contrast.test.ts's "hue-text-mix
// on a 15%-tinted pill" block), so text goes through the same
// hueTextColor mix MetricCard's state link uses. "muted" isn't a real
// hue token (stopped/loading/disabled/unavailable): the kit's own
// muted surface pair instead, the same one every other muted badge uses.
export function StatusPill({ status, className }: { status: StatusKind; className?: string }) {
  const entry = statusFor(status);
  const hueVar = `--hue-${entry.hue}`;
  const muted = entry.hue === "muted";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={muted ? { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" } : { backgroundColor: hueTintBackground(hueVar), color: hueTextColor(hueVar) }}
    >
      {entry.dot && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", statusDotClass(status))} />}
      {entry.label}
    </span>
  );
}
