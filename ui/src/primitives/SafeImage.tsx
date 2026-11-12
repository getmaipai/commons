import { useEffect, useState, type ComponentProps, type ReactNode, type Ref, type SyntheticEvent } from "react";
import { cn } from "@/kit/utils";
import { getIcon } from "@/kit/icons";

export type ImageFallbackKind = "music" | "podcast" | "video" | "file" | "person" | "picture";
type ImageProps = ComponentProps<"img">;

/** Tracks a failed source and clears the failure when the address changes. */
export function useImageFallback(src: string | undefined | null) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  useEffect(() => setFailedSrc(null), [src]);
  return {
    hasFallback: !src || failedSrc === src,
    onError: () => { if (src) setFailedSrc(src); },
    reset: () => setFailedSrc(null),
  };
}

const ICONS = {
  music: "music",
  podcast: "mic",
  video: "film",
  file: "file-text",
  person: "user-round",
  picture: "camera",
} as const satisfies Record<ImageFallbackKind, string>;

const CLASS_SIZES_WIDTH = /(?:^|\s)(?:size-|w-)/;
const CLASS_SIZES_HEIGHT = /(?:^|\s)(?:size-|h-)/;

// Theme tokens only: two stable accent choices make each missing cover feel like its own picture.
const SOFT_TINTS = ["--primary", "--hue-violet", "--hue-teal", "--hue-orange", "--hue-pink", "--hue-yellow", "--hue-green", "--hue-red"] as const;
function tintHash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
}

/** Generated cover art: six drawn motifs, picked by the name's hash and tinted with the same two theme tokens as the tile. */
const MOTIFS: readonly ((n: number) => ReactNode)[] = [
  // concentric rings
  (n) => <>{[10, 22, 34, 46].map((r) => <circle key={r} cx={30 + (n % 40)} cy={70 - (n % 30)} r={r + 8} fill="none" stroke="var(--art-tint-b)" strokeWidth="3" opacity={0.55 - r / 120} />)}</>,
  // flowing waves
  (n) => <>{[0, 1, 2, 3].map((i) => <path key={i} d={`M-5 ${48 + i * 14} C 20 ${30 + i * 14 + (n % 9)}, 45 ${70 + i * 14 - (n % 7)}, 70 ${50 + i * 14} S 100 ${40 + i * 14}, 110 ${56 + i * 14}`} fill="none" stroke="var(--art-foreground)" strokeWidth="2.2" opacity={0.42 - i * 0.07} />)}</>,
  // soft diagonal bands
  (n) => <>{[0, 1, 2].map((i) => <rect key={i} x={-20 + i * 38 + (n % 12)} y="-30" width="22" height="170" fill="var(--art-tint-b)" opacity={0.34 - i * 0.07} transform="rotate(28 50 50)" />)}</>,
  // half sun over a horizon
  (n) => <><circle cx={34 + (n % 32)} cy="58" r="26" fill="var(--art-tint-b)" opacity="0.6" /><rect x="-5" y="58" width="110" height="50" fill="var(--art-tint-a)" opacity="0.8" />{[66, 74, 82].map((y) => <rect key={y} x="-5" y={y} width="110" height="2.2" fill="var(--art-foreground)" opacity="0.22" />)}</>,
  // dot grid fading out
  (n) => <>{Array.from({ length: 36 }, (_, i) => <circle key={i} cx={14 + (i % 6) * 14} cy={14 + Math.floor(i / 6) * 14} r={1.4 + (((i * 7 + n) % 5) / 5) * 3.4} fill="var(--art-foreground)" opacity={0.18 + (((i * 5 + n) % 7) / 7) * 0.3} />)}</>,
  // overlapping arcs
  (n) => <>{[0, 1, 2].map((i) => <path key={i} d={`M ${-10 + i * 6} 100 A ${50 + i * 14} ${50 + i * 14} 0 0 1 ${60 + (n % 20) + i * 16} ${100 - 70 - i * 10}`} fill="none" stroke="var(--art-tint-b)" strokeWidth={9 - i * 2} strokeLinecap="round" opacity={0.5 - i * 0.1} />)}</>,
];
function CoverArt({ hash }: { hash: number }) {
  const motif = MOTIFS[(hash >>> 16) % MOTIFS.length]!;
  return (
    <svg data-slot="safe-image-art" aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 -z-10 size-full">
      {motif(hash % 97)}
    </svg>
  );
}
/** The first letters of the first two words, upper-cased ("Blue Hour" is "BH"); empty when the name has no letters. */
export function initials(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.slice(0, 2).map((w) => [...w][0]!.toUpperCase()).join("");
}

export interface SafeImageProps extends Omit<ImageProps, "src" | "onError"> {
  src?: string | null;
  kind?: ImageFallbackKind;
  fallbackContent?: ReactNode;
  fallbackAfterIcon?: ReactNode;
  /** PRO-LOOK-01: with a seed (the item's name) the empty or broken picture is a soft tinted tile (a theme-token tint picked from the
   * seed, the first letters of the name, or the kind's icon when it has none) instead of the flat gray square. */
  tintSeed?: string;
  /** Optional name rendered on the art tile. */
  label?: string;
  onError?: ImageProps["onError"];
  imageRef?: Ref<HTMLImageElement>;
}

/** An image which always occupies its box, using the kit's themed icon tile when absent or broken. */
export function SafeImage({ src, alt = "", kind = "picture", fallbackContent, fallbackAfterIcon, tintSeed, label, className, onError, imageRef, loading = "lazy", ...props }: SafeImageProps) {
  const fallback = useImageFallback(src);
  const Icon = getIcon(ICONS[kind]);
  const hasBoxSizing = /(?:^|\s)(?:size-|w-full|w-\[|h-full|h-\[|aspect-)/.test(className ?? "") || props.width !== undefined || props.height !== undefined;
  const seedHash = tintHash(tintSeed ?? alt ?? kind);
  const tintIndex = seedHash % SOFT_TINTS.length;
  const secondTintIndex = (tintIndex + 1 + ((seedHash >>> 8) % (SOFT_TINTS.length - 1))) % SOFT_TINTS.length;
  const ratio = kind === "video" ? "aspect-video" : kind === "person" ? "aspect-[3/4]" : "aspect-square";
  const fallbackClass = cn("@container/safe-art relative isolate overflow-hidden bg-[color-mix(in_oklab,var(--art-tint-a)_56%,var(--art-tint-b))] text-[var(--art-foreground)] flex items-center justify-center", !hasBoxSizing && `${ratio} w-full min-h-16`, className);
  if (fallback.hasFallback) {
    return (
      <span
        data-slot="safe-image-fallback"
        data-kind={kind}
        data-tinted=""
        className={fallbackClass}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        style={{
          // A width and height prop are the picture's intrinsic hints. When the class already sizes that axis (`size-full`,
          // `w-full`, `h-full`, a fixed `w-` or `h-`), the inline pixels would beat it, so a 320 x 240 hint on a 164 px tile drew the
          // box wider than the tile and pushed the centred icon out of view at 375 px. The class wins; the hint only fills a gap.
          ...(props.width !== undefined && !CLASS_SIZES_WIDTH.test(className ?? "") ? { width: typeof props.width === "number" ? `${props.width}px` : props.width } : {}),
          ...(props.height !== undefined && !CLASS_SIZES_HEIGHT.test(className ?? "") ? { height: typeof props.height === "number" ? `${props.height}px` : props.height } : {}),
          ["--art-tint-a" as string]: `var(${SOFT_TINTS[tintIndex]})`,
          ["--art-tint-b" as string]: `var(${SOFT_TINTS[secondTintIndex]})`,
          ...props.style,
        }}
      >
          {tintSeed ? <CoverArt hash={seedHash} /> : null}
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_22%_20%,color-mix(in_oklab,var(--art-tint-b)_48%,transparent),transparent_72%)]" />
          {fallbackContent ?? <Icon data-slot="safe-image-icon" aria-hidden className="absolute bottom-2 right-2 size-[clamp(14px,16%,28px)] opacity-75" />}
          {fallbackAfterIcon}
          {label ? <span data-slot="safe-image-label" className="absolute inset-x-0 bottom-0 truncate bg-[var(--art-scrim)] px-3 pb-2 pt-6 text-left text-base font-medium leading-5 text-[var(--art-foreground)]">{label}</span> : null}
      </span>
    );
  }
  return (
    <img
      {...props}
      ref={imageRef}
      src={src!}
      alt={alt}
      loading={loading}
      className={className}
      onError={(event: SyntheticEvent<HTMLImageElement>) => { fallback.onError(); onError?.(event); }}
    />
  );
}
