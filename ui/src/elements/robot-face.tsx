import type { CSSProperties } from "react";

export type RobotFaceColor = "mint" | "sky" | "peach" | "lavender" | "lemon" | "rose" | "cloud";
export type RobotFaceExpression = "idle" | "present" | "listening" | "thinking" | "working" | "speaking" | "asking" | "done" | "concerned" | "sleeping" | "offline";
export type RobotFaceProps = {
  color?: RobotFaceColor;
  night?: boolean;
  expression?: RobotFaceExpression;
  size?: "header" | "stage";
  name: string;
};

// These are physical display colours, kept independent of theme tokens. Mint is the firmware face palette;
// the other six soft pastels are kit approximations because the firmware does not define named face colours for them.
export const ROBOT_FACE_COLORS: Record<RobotFaceColor, { background: string; ink: string }> = {
  mint: { background: "#C4F0DA", ink: "#18241F" },
  sky: { background: "#CDEBFA", ink: "#18241F" },
  peach: { background: "#F8D9C9", ink: "#18241F" },
  lavender: { background: "#E2D9F5", ink: "#18241F" },
  lemon: { background: "#F5EDB9", ink: "#18241F" },
  rose: { background: "#F4D1DB", ink: "#18241F" },
  cloud: { background: "#E8ECEA", ink: "#18241F" },
};

export function RobotFace({ color = "mint", night = false, expression = "idle", size = "stage", name }: RobotFaceProps) {
  const palette = ROBOT_FACE_COLORS[color];
  const ink = night ? "#C4F0DA" : palette.ink;
  const background = night ? "#000000" : palette.background;
  const closed = expression === "sleeping" || expression === "offline";
  const wide = expression === "listening";
  const look = expression === "thinking";
  const eyeRx = wide ? 5.3 : 4.3;
  const eyeY = look ? 31 : 36;
  const leftX = look ? 29 : 31;
  const rightX = look ? 53 : 49;
  const mouth = expression === "speaking" ? <ellipse cx="41" cy="55" rx="5" ry="6" fill={ink} />
    : expression === "done" ? <path d="M32 52 Q41 62 50 52" />
    : expression === "concerned" ? <path d="M32 57 Q41 51 50 57" />
    : expression === "working" ? <path d="M35 55 H47" />
    : expression === "asking" ? <path d="M35 54 Q41 58 47 54" />
    : <path d="M35 54 Q41 57 47 54" />;
  const style: CSSProperties = size === "header" ? { width: 36, height: 36, flex: "none" } : { width: "100%", height: "100%", aspectRatio: "4 / 3" };
  return <svg data-slot="robot-face" data-expression={expression} data-color={color} role="img" aria-label={`${name}'s face, ${expression}`} viewBox="0 0 82 62" style={style} className={`block overflow-hidden ${size === "header" ? "rounded-xl" : "rounded-[12%]"} transition-colors duration-300 motion-reduce:transition-none`}>
    <rect width="82" height="62" fill={background} />
    <g fill={closed ? "none" : ink} stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity={expression === "offline" ? 0.4 : 1}>
      {closed ? <><path d="M25 37 Q31 43 37 37" fill="none" /><path d="M45 37 Q51 43 57 37" fill="none" /></> : <>
        <ellipse cx={leftX} cy={eyeY} rx={eyeRx} ry={wide ? 7 : 5.5} />
        <ellipse cx={rightX} cy={eyeY} rx={eyeRx} ry={wide ? 7 : 5.5} />
        {expression === "asking" ? <path d="M46 22 Q52 19 57 22" fill="none" /> : null}
      </>}
      {mouth}
    </g>
  </svg>;
}
