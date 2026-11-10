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

// Theme tokens only: each tile mixes one of these into the card colour, so every theme and accent gets its own soft tints.
const SOFT_TINTS = ["--primary", "--status-progress-ink", "--status-done-ink", "--status-attention-ink", "--tint-info-border", "--status-waiting-ink"] as const;
function tintHash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
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
  onError?: ImageProps["onError"];
  imageRef?: Ref<HTMLImageElement>;
}

/** An image which always occupies its box, using the kit's themed icon tile when absent or broken. */
export function SafeImage({ src, alt = "", kind = "picture", fallbackContent, fallbackAfterIcon, tintSeed, className, onError, imageRef, loading = "lazy", ...props }: SafeImageProps) {
  const fallback = useImageFallback(src);
  const Icon = getIcon(ICONS[kind]);
  const hasBoxSizing = /(?:^|\s)(?:size-|w-full|w-\[|h-full|h-\[|aspect-)/.test(className ?? "") || props.width !== undefined || props.height !== undefined;
  const tinted = tintSeed !== undefined;
  const tintIndex = tinted ? tintHash(tintSeed) % SOFT_TINTS.length : 0;
  const letters = tinted ? initials(tintSeed) : "";
  const fallbackClass = cn(tinted ? "@container/safe-art bg-[color-mix(in_oklab,var(--tile-tint)_22%,var(--card))] text-foreground flex items-center justify-center" : "bg-muted text-muted-foreground flex items-center justify-center", !hasBoxSizing && "aspect-video w-full min-h-16", className);
  if (fallback.hasFallback) {
    return (
      <span
        data-slot="safe-image-fallback"
        data-kind={kind}
        data-tinted={tinted ? "" : undefined}
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
          ...(tinted ? { ["--tile-tint" as string]: `var(${SOFT_TINTS[tintIndex]})` } : {}),
          ...props.style,
        }}
      >
        {fallbackContent ?? (tinted && letters ? <>
          {/* A big tile shows the initials; a small one (a row's cover) shows the kind icon, so it is never a blank square. */}
          <span data-slot="safe-image-initials" className="hidden text-3xl font-semibold tracking-tight opacity-80 @[6rem]/safe-art:block">{letters}</span>
          <Icon data-slot="safe-image-icon" aria-hidden className="size-[clamp(14px,40%,28px)] opacity-80 @[6rem]/safe-art:hidden" />
        </> : <><Icon aria-hidden className="size-1/3" />{fallbackAfterIcon}</>)}
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
