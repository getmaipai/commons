import type { CSSProperties, ReactNode } from "react";

/**
 * Generated cover art for an item with no picture, in the two styles streaming apps use for their own playlists and stations:
 * a slowly drifting colour-mesh cover with a big centred title, and a flat colour tile with a large line-drawn glyph. The name's hash
 * picks the style, the colours and the glyph, so the same name always draws the same cover. It is plain HTML, SVG and CSS: instant,
 * no engine time, and the drift stops under reduced motion. Colour comes only from the `--art-tint-*` and `--art-foreground` tokens
 * SafeImage sets from the theme; sizes are container-query units of the tile.
 */
export const COVER_STYLES = 2;
export const COVER_GLYPHS = 6;

function hashOf(text: string, salt = ""): number {
  let h = 0;
  for (const ch of `${text}${salt}`) h = (Math.imul(h, 31) + ch.codePointAt(0)!) | 0;
  return Math.abs(h);
}

/** Title size in container-query width units: short names are big, long names step down so nothing is cut off. */
export function coverTitleSize(length: number): number {
  return length <= 6 ? 20 : length <= 10 ? 16 : length <= 16 ? 12.5 : length <= 26 ? 9.5 : length <= 40 ? 7 : 5.5;
}

const FG = "var(--art-foreground)";
const fill = "absolute inset-0";
const tints = ["var(--art-tint-a)", "var(--art-tint-b)", "var(--art-tint-c)", "var(--art-tint-d)"] as const;

/** Six line glyphs on a 100 box, drawn with the foreground stroke only. */
function Glyph({ index }: { index: number }) {
  const common = { fill: "none", stroke: FG, strokeWidth: 1.1, strokeLinejoin: "round", strokeLinecap: "round", vectorEffect: "non-scaling-stroke" } as const;
  const lines: ReactNode[] = [];
  switch (index) {
    case 0: // concentric rings
      for (const r of [40, 29, 18, 7]) lines.push(<circle key={r} cx="50" cy="50" r={r} {...common} />);
      break;
    case 1: // bolt
      lines.push(<path key="b" d="M64 8 L22 54 H46 L36 92 L80 42 H54 Z" {...common} />, <path key="b2" d="M60 16 L28 52 H50 L43 80" {...common} opacity="0.5" />);
      break;
    case 2: // stacked ovals
      for (const [cy, ry] of [[24, 14], [50, 20], [76, 14]] as const) lines.push(<ellipse key={cy} cx="50" cy={cy} rx="34" ry={ry} {...common} />);
      break;
    case 3: // heart, outlined twice
      lines.push(<path key="h" d="M50 86 C14 58 8 34 22 22 C34 12 46 20 50 30 C54 20 66 12 78 22 C92 34 86 58 50 86 Z" {...common} />, <path key="h2" d="M50 74 C24 54 20 38 28 30 C36 23 45 28 50 36" {...common} opacity="0.5" />);
      break;
    case 4: // spiral of ellipses
      for (let i = 0; i < 6; i++) lines.push(<ellipse key={i} cx="50" cy={22 + i * 10} rx={36 - i * 5} ry={9 - i * 0.6} {...common} />);
      break;
    default: // four-point star
      lines.push(<path key="s" d="M50 6 C54 34 66 46 94 50 C66 54 54 66 50 94 C46 66 34 54 6 50 C34 46 46 34 50 6 Z" {...common} />, <path key="s2" d="M50 22 C52 38 62 48 78 50 C62 52 52 62 50 78 C48 62 38 52 22 50 C38 48 48 38 50 22 Z" {...common} opacity="0.5" />);
  }
  return <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-[9%] size-[82%]">{lines}</svg>;
}

export interface GeneratedCoverProps { title: string; hash?: number }

export function GeneratedCover({ title, hash }: GeneratedCoverProps) {
  const name = title.trim();
  const seed = hash ?? hashOf(name);
  const style = (seed >>> 3) % COVER_STYLES;
  const length = [...name].length;
  const heading: CSSProperties = {
    color: FG,
    fontFamily: "var(--font-sans, inherit)",
    fontWeight: 700,
    fontSize: `${coverTitleSize(length)}cqw`,
    lineHeight: 1.02,
    letterSpacing: "-0.02em",
    overflowWrap: "anywhere",
    textAlign: "center",
  };
  const rotation = seed % 360;
  const blob = (i: number): ReactNode => {
    const h = hashOf(name, `#b${i}`);
    const size = 70 + (h % 40);
    return (
      <div
        key={i}
        data-slot="generated-cover-blob"
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: `${size}cqw`, height: `${size}cqw`,
          left: `${(h % 70) - 25}%`, top: `${((h >>> 5) % 70) - 25}%`,
          background: tints[(i + 1) % tints.length],
          filter: "blur(9cqw)", opacity: 0.9,
          animation: `generated-cover-drift ${16 + (h % 9)}s ease-in-out ${-(h % 14)}s infinite alternate`,
        }}
      />
    );
  };

  let body: ReactNode;
  if (style === 0) {
    body = (<>
      <div aria-hidden className={fill} style={{ background: `linear-gradient(${rotation}deg, ${tints[0]}, ${tints[2]})` }} />
      {[0, 1, 2, 3].map(blob)}
      <div className="absolute inset-0 flex items-center justify-center" style={{ padding: "9%" }}>
        {name ? <span data-slot="generated-cover-title" data-title={name} style={heading} /> : null}
      </div>
    </>);
  } else {
    body = (<>
      <div aria-hidden className={fill} style={{ background: tints[0] }} />
      <Glyph index={(seed >>> 6) % COVER_GLYPHS} />
      {name ? <div className="absolute inset-x-0 bottom-0" style={{ padding: "6%" }}><span data-slot="generated-cover-title" data-title={name} style={{ ...heading, fontSize: `${Math.min(coverTitleSize(length), 9)}cqw`, textAlign: "left", display: "block" }} /></div> : null}
    </>);
  }
  return (
    <div data-slot="generated-cover" data-style={style === 0 ? "mesh" : "glyph"} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {body}
    </div>
  );
}
