import type { CSSProperties, ReactNode } from "react";

/**
 * Generated cover art for an item with no picture: a poster of its name over layered shapes, picked by the name's hash so the same
 * name always draws the same cover (ported in idea from Loki Doki's GeneratedAlbumCover, rebuilt on theme tokens). It draws in plain
 * HTML and CSS, so it is instant and costs no engine time. Colour comes only from `--art-tint-a`, `--art-tint-b` and
 * `--art-foreground`, which SafeImage sets from the theme; sizes are container-query units of the tile.
 */
export const COVER_TEMPLATES = 8;

function hashOf(text: string, salt = ""): number {
  let h = 0;
  for (const ch of `${text}${salt}`) h = (Math.imul(h, 31) + ch.codePointAt(0)!) | 0;
  return Math.abs(h);
}

/** Title size in container-query width units: short names are big, long names step down so nothing is cut off. */
export function coverTitleSize(length: number): number {
  return length <= 8 ? 15 : length <= 14 ? 11.5 : length <= 24 ? 8.5 : length <= 40 ? 6.5 : 5.2;
}

const A = "var(--art-tint-a)";
const B = "var(--art-tint-b)";
const FG = "var(--art-foreground)";
const mix = (color: string, pct: number): string => `color-mix(in oklab, ${color} ${pct}%, transparent)`;
const fill = "absolute inset-0";

export interface GeneratedCoverProps { title: string; hash?: number }

export function GeneratedCover({ title, hash }: GeneratedCoverProps) {
  const name = title.trim();
  const seed = hash ?? hashOf(name);
  const template = seed % COVER_TEMPLATES;
  const angle = 100 + (hashOf(name, "#a") % 6) * 28;
  const upper = hashOf(name, "#u") % 4 !== 0;
  const size = `${coverTitleSize([...name].length)}cqw`;
  const text: CSSProperties = {
    color: FG,
    fontFamily: "var(--font-display, var(--font-sans, inherit))",
    fontWeight: 800,
    fontSize: size,
    lineHeight: 0.98,
    letterSpacing: "-0.01em",
    textTransform: upper ? "uppercase" : "none",
    overflowWrap: "anywhere",
  };
  const heading = (align: "left" | "center" = "left"): ReactNode =>
    name ? <span data-slot="generated-cover-title" data-title={name} style={{ ...text, textAlign: align }} /> : null;
  const grain = <div aria-hidden className={fill} style={{ opacity: 0.14, mixBlendMode: "overlay", backgroundImage: "radial-gradient(currentColor 0.5px, transparent 0.6px)", backgroundSize: "3px 3px", color: FG }} />;
  const base = <div aria-hidden className={fill} style={{ background: `linear-gradient(${angle}deg, ${A}, ${B})` }} />;
  const glow = <div aria-hidden className={fill} style={{ background: `radial-gradient(ellipse at ${20 + (seed % 50)}% ${15 + (seed % 30)}%, ${mix(FG, 30)}, transparent 62%)` }} />;
  const monogram = [...(name || "?")][0]!.toUpperCase();

  let body: ReactNode;
  switch (template) {
    case 0: // colour bar across the bottom under a sun
      body = (<>
        <div aria-hidden className="absolute" style={{ left: "18%", top: "10%", width: "46cqw", height: "46cqw", borderRadius: "999px", background: mix(FG, 22) }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0" style={{ height: "44%", background: mix(A, 90) }} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end" style={{ height: "44%", padding: "7%" }}>{heading()}</div>
      </>);
      break;
    case 1: // title on top, big rings below
      body = (<>
        <div aria-hidden className="absolute" style={{ right: "-22%", bottom: "-22%", width: "86cqw", height: "86cqw", borderRadius: "999px", border: `6cqw solid ${mix(FG, 26)}` }} />
        <div aria-hidden className="absolute" style={{ right: "-6%", bottom: "-6%", width: "52cqw", height: "52cqw", borderRadius: "999px", border: `3cqw solid ${mix(FG, 20)}` }} />
        <div className="absolute inset-x-0 top-0" style={{ padding: "8%" }}>{heading()}</div>
      </>);
      break;
    case 2: // centred with a thin rule and a vignette
      body = (<>
        <div aria-hidden className={fill} style={{ background: `radial-gradient(ellipse at center, transparent 30%, ${mix(A, 70)} 100%)` }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ padding: "11%", gap: "5%" }}>
          {heading("center")}
          <div aria-hidden style={{ width: "26%", height: "0.7cqw", background: FG, opacity: 0.8 }} />
        </div>
      </>);
      break;
    case 3: // a spine strip on the left, the title standing on it
      body = (<>
        <div aria-hidden className="absolute inset-y-0 left-0" style={{ width: "30%", background: mix(A, 92) }} />
        <div aria-hidden className="absolute" style={{ right: "-10%", top: "18%", width: "60cqw", height: "60cqw", borderRadius: "999px", background: mix(FG, 16) }} />
        <span className="absolute inset-y-0 left-0 flex items-center justify-center" style={{ width: "30%", writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap", padding: "8% 0", ...text, fontSize: `${Math.min(coverTitleSize([...name].length), 11)}cqw` }} data-slot="generated-cover-title" data-title={name} />
      </>);
      break;
    case 4: // a diagonal strip across the lower third
      body = (<>
        <div aria-hidden className={fill} style={{ background: `linear-gradient(to top, ${mix(A, 85)} 4%, transparent 62%)` }} />
        <div aria-hidden className="absolute" style={{ left: "-15%", right: "-15%", top: "52%", height: "10%", background: mix(FG, 80), transform: "rotate(-7deg)", opacity: 0.9 }} />
        <div className="absolute inset-x-0 bottom-0" style={{ padding: "7%" }}>{heading()}</div>
      </>);
      break;
    case 5: // a colour triangle over the top-left half
      body = (<>
        <div aria-hidden className={fill} style={{ background: mix(A, 82), clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
        <div aria-hidden className={fill} style={{ background: `linear-gradient(to top, ${mix(B, 80)}, transparent 46%)` }} />
        <div className="absolute" style={{ top: "7%", left: "7%", right: "26%" }}>{heading()}</div>
      </>);
      break;
    case 6: // a framed poster
      body = (<>
        <div aria-hidden className="absolute" style={{ inset: "6%", border: `0.9cqw solid ${FG}`, opacity: 0.75 }} />
        <div className="absolute inset-0 flex items-center justify-center text-center" style={{ padding: "14%" }}>{heading("center")}</div>
      </>);
      break;
    default: // a giant first letter with the title at the bottom
      body = (<>
        <span aria-hidden className="absolute inset-0 flex items-center justify-center" style={{ ...text, fontSize: "92cqw", fontWeight: 900, lineHeight: 1, opacity: 0.16, textTransform: "uppercase", textShadow: "none" }}>{monogram}</span>
        <div aria-hidden className={fill} style={{ background: `linear-gradient(to top, ${mix(A, 80)} 4%, transparent 56%)` }} />
        <div className="absolute inset-x-0 bottom-0" style={{ padding: "7%" }}>{heading()}</div>
      </>);
  }
  return (
    <div data-slot="generated-cover" data-template={template} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {base}{glow}{body}{grain}
    </div>
  );
}
