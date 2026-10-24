import { useEffect, useState, type ComponentProps, type ReactNode, type Ref, type SyntheticEvent } from "react";
import { cn } from "@/kit/utils";
import { getIcon } from "@/kit/icons";

export type ImageFallbackKind = "music" | "video" | "file" | "person" | "picture";
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
  video: "film",
  file: "file-text",
  person: "user-round",
  picture: "camera",
} as const satisfies Record<ImageFallbackKind, string>;

export interface SafeImageProps extends Omit<ImageProps, "src" | "onError"> {
  src?: string | null;
  kind?: ImageFallbackKind;
  fallbackContent?: ReactNode;
  fallbackAfterIcon?: ReactNode;
  onError?: ImageProps["onError"];
  imageRef?: Ref<HTMLImageElement>;
}

/** An image which always occupies its box, using the kit's themed icon tile when absent or broken. */
export function SafeImage({ src, alt = "", kind = "picture", fallbackContent, fallbackAfterIcon, className, onError, imageRef, loading = "lazy", ...props }: SafeImageProps) {
  const fallback = useImageFallback(src);
  const Icon = getIcon(ICONS[kind]);
  const hasBoxSizing = /(?:^|\s)(?:size-|w-full|w-\[|h-full|h-\[|aspect-)/.test(className ?? "") || props.width !== undefined || props.height !== undefined;
  const fallbackClass = cn("bg-muted text-muted-foreground flex items-center justify-center", !hasBoxSizing && "aspect-video w-full min-h-16", className);
  if (fallback.hasFallback) {
    return (
      <span
        data-slot="safe-image-fallback"
        data-kind={kind}
        className={fallbackClass}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        style={{
          ...(props.width !== undefined ? { width: typeof props.width === "number" ? `${props.width}px` : props.width } : {}),
          ...(props.height !== undefined ? { height: typeof props.height === "number" ? `${props.height}px` : props.height } : {}),
          ...props.style,
        }}
      >
        {fallbackContent ?? <><Icon aria-hidden className="size-1/3" />{fallbackAfterIcon}</>}
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
