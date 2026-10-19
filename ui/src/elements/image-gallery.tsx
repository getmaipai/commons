/**
 * Source: @assistant-ui/elements-image-gallery from the assistant-ui shadcn registry.
 * modified:
 * - Reuse the kit's local safeHref, clamp, and themed surface helpers.
 * - Use the kit's dialog implementation and import aliases.
 */
"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  ImageOffIcon,
  PencilIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Dialog, DialogContent, DialogTitle } from "@/elements/ui/dialog";
import { cn } from "cn";
import { Button } from "./ui/button";
import { TooltipIconButton } from "./tooltip-icon-button";
import { safeHref } from "./href";
import { clamp } from "./range";
import { field, ghostButton, imageEditRevealClass, mono } from "./surfaces";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption?: string | undefined;
  source?: { label?: string | undefined; url?: string | undefined } | undefined;
}

export interface GalleryImageEdit {
  id: string;
  src: string;
  alt: string;
  index: number;
}

/** A choice offered under the pictures, such as making them again another way. */
export interface GalleryAction {
  id: string;
  label: string;
  /** A short muted line beside the button that says what pressing it does. */
  hint?: string | undefined;
  disabled?: boolean | undefined;
  onSelect: () => void;
}

export interface ImageGalleryProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  images: readonly GalleryImage[];
  maxVisible?: number | undefined;
  onOpen?: ((id: string) => void) | undefined;
  /** Shows an Edit button on each tile's top-start corner (hover or focus on
   * a pointer device, always on touch). Opening the tile is not triggered. */
  onEditImage?: ((image: GalleryImageEdit) => void) | undefined;
  /** Keep Edit visible without hover or focus. Default false. */
  editAlwaysVisible?: boolean | undefined;
  /** Default true. Return false to hide Edit for one picture. */
  canEditImage?: ((image: GalleryImageEdit) => boolean) | undefined;
  /** Accessible name of the Edit button. Default "Edit picture". */
  editLabel?: string | undefined;
  /** `large` shows a single picture across the whole gallery width at its own proportions, never cropped to a square (a picture the person made themselves, not a thumbnail among others); several pictures keep the square grid. Default `default`. */
  size?: "default" | "large" | undefined;
  /** Outline buttons under the pictures, each with an optional muted hint. None by default. */
  actions?: readonly GalleryAction[] | undefined;
  /** `row` (default) draws one row of square tiles sized to the container: as many as fit, up to `maxVisible`, and the last visible tile shows +N for the rest. Phones fit fewer tiles, still one row. `grid` wraps the tiles onto two or three columns and as many rows as needed. */
  layout?: "row" | "grid" | undefined;
}

/** Smallest square tile in the one-row layout, in px (4.5rem at the root size of 16). */
export const GALLERY_TILE_MIN = 72;
/** Space between tiles, in px (the `gap-2` token). */
export const GALLERY_GAP = 8;

/**
 * How many square tiles of at least `tileMin` px fit side by side in one row of
 * `containerWidth` px with `gap` px between them, never more than `maxVisible`
 * and never fewer than 1. A width that is not known yet (0, negative, NaN) gives
 * `maxVisible`, so the first paint and server render show every allowed tile.
 */
export function tilesThatFit(
  containerWidth: number,
  tileMin: number,
  gap: number,
  maxVisible: number,
): number {
  const cap = Math.max(1, Math.floor(Number.isFinite(maxVisible) ? maxVisible : 1));
  if (!(containerWidth > 0) || !(tileMin > 0)) return cap;
  const fit = Math.floor((containerWidth + gap) / (tileMin + gap));
  return Math.min(cap, Math.max(1, fit));
}

const keyForImage = (image: GalleryImage) => `${image.id}\u0000${image.src}`;

export function ImageGallery({
  images,
  maxVisible = 6,
  onOpen,
  onEditImage,
  editAlwaysVisible = false,
  canEditImage,
  editLabel = "Edit picture",
  size = "default",
  actions,
  layout = "row",
  className,
  ...props
}: ImageGalleryProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const index = images.findIndex((image) => image.id === activeId);
  if (activeId !== null && index === -1) setActiveId(null);
  const activeImage = index === -1 ? undefined : images[index];
  const sourceHref = safeHref(activeImage?.source?.url);
  const natural = size === "large" && images.length === 1;
  const oneRow = layout === "row" && !natural;
  const slots = oneRow
    ? tilesThatFit(width, GALLERY_TILE_MIN, GALLERY_GAP, maxVisible)
    : 0;
  const visibleCount = oneRow
    ? Math.min(slots, images.length)
    : Math.floor(clamp(maxVisible, 1, images.length));
  const visibleImages = images.slice(0, visibleCount);

  const hasImages = images.length > 0;
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !oneRow) return undefined;
    const measure = () => setWidth(Math.floor(root.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next === undefined) measure();
      else setWidth(Math.floor(next));
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [oneRow, hasImages]);

  const close = useCallback(() => {
    setActiveId(null);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (activeImage === undefined) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        setActiveId(images[index - 1]?.id ?? null);
      } else if (event.key === "ArrowRight" && index < images.length - 1) {
        event.preventDefault();
        setActiveId(images[index + 1]?.id ?? null);
      }
    };
    // The dialog stops keydown propagation, so only a capture listener sees the arrows.
    document.addEventListener("keydown", onKeyDown, true);

    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [activeImage, images, index]);

  const open = (nextIndex: number, trigger: HTMLButtonElement) => {
    const image = images[nextIndex];
    if (!image) return;
    triggerRef.current = trigger;
    setActiveId(image.id);
    onOpen?.(image.id);
  };

  const markFailed = (image: GalleryImage) => {
    const key = keyForImage(image);
    setFailedImages((current) =>
      current.has(key) ? current : new Set(current).add(key),
    );
  };

  if (images.length === 0) return null;

  return (
    <div
      ref={rootRef}
      data-slot="image-gallery"
      className={cn("@container w-full max-w-md", className)}
      {...props}
    >
      <div
        data-layout={oneRow ? "row" : "grid"}
        className={cn("grid gap-2", !oneRow && (natural ? "grid-cols-1" : "grid-cols-2 @sm:grid-cols-3"))}
        style={oneRow ? { gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` } : undefined}
      >
        {visibleImages.map((image, imageIndex) => {
          const failed = failedImages.has(keyForImage(image));
          const overflow =
            imageIndex === visibleCount - 1 && images.length > visibleCount;

          const editTarget: GalleryImageEdit = {
            id: image.id,
            src: image.src,
            alt: image.alt,
            index: imageIndex,
          };
          const editable =
            onEditImage !== undefined &&
            !failed &&
            (canEditImage ? canEditImage(editTarget) : true);

          const tile = (
            <button
              key={image.id}
              type="button"
              aria-label={`Open image: ${image.alt}`}
              onClick={(event) => open(imageIndex, event.currentTarget)}
              className={cn(
                field,
                natural ? "block w-full" : "aspect-square",
                "focus-visible:ring-foreground/30 relative overflow-hidden rounded-xl transition-[transform,background-color] duration-150 outline-none hover:scale-[1.01] focus-visible:ring-1 active:scale-[0.98] motion-reduce:transition-none",
              )}
            >
              {failed ? (
                <span className="text-muted-foreground flex size-full items-center justify-center">
                  <ImageOffIcon aria-hidden className="size-6" />
                </span>
              ) : (
                <img
                  src={image.src}
                  alt={image.alt}
                  loading="lazy"
                  className={natural ? "block h-auto max-h-[32rem] w-full object-contain" : "size-full object-cover"}
                  onError={() => markFailed(image)}
                />
              )}
              {overflow ? (
                <span className="bg-foreground/65 text-background absolute inset-0 flex items-center justify-center text-lg font-medium">
                  +{images.length - visibleCount}
                </span>
              ) : null}
            </button>
          );

          if (!editable) return tile;
          return (
            <div
              key={image.id}
              data-slot="image-gallery-tile"
              className="group/edit-tile relative"
            >
              {tile}
              <TooltipIconButton
                tooltip={editLabel}
                side="top"
                data-image-edit="true"
                className={cn(
                  "absolute start-2 top-2 z-10 size-6 rounded-full bg-background/70! text-foreground after:absolute after:-inset-1.5 hover:bg-background/90! hover:text-foreground! active:scale-[0.96]",
                  editAlwaysVisible ? "size-12" : "",
                  editAlwaysVisible ? "opacity-100" : imageEditRevealClass,
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onEditImage(editTarget);
                }}
              >
                <PencilIcon aria-hidden className="size-3.5 stroke-[2.5]" />
              </TooltipIconButton>
            </div>
          );
        })}
      </div>
      {actions && actions.length > 0 ? (
        <div data-slot="image-gallery-actions" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {actions.map((action) => (
            <div key={action.id} className="flex min-w-0 flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={action.disabled} onClick={action.onSelect}>
                {action.label}
              </Button>
              {action.hint ? <span className="text-muted-foreground text-xs">{action.hint}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      {activeImage ? (
        <Dialog
          open
          onOpenChange={(nextOpen: boolean) => {
            if (!nextOpen) close();
          }}
        >
          <DialogContent className="gap-3 p-3 duration-150 motion-reduce:animate-none sm:max-w-4xl">
            <DialogTitle className="sr-only">
              Image {index + 1} of {images.length}
            </DialogTitle>
            <div className="flex min-h-0 items-center justify-center px-10">
              {failedImages.has(keyForImage(activeImage)) ? (
                <div className="text-muted-foreground flex h-[min(75vh,32rem)] w-full items-center justify-center">
                  <ImageOffIcon aria-hidden className="size-8" />
                </div>
              ) : (
                <img
                  src={activeImage.src}
                  alt={activeImage.alt}
                  className="max-h-[75vh] max-w-full object-contain"
                  onError={() => markFailed(activeImage)}
                />
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                aria-label="Previous image"
                disabled={index === 0}
                onClick={() => setActiveId(images[index - 1]?.id ?? null)}
                className={cn(
                  ghostButton,
                  "size-8 shrink-0 disabled:pointer-events-none disabled:opacity-30",
                )}
              >
                <ChevronLeftIcon aria-hidden className="size-4" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                {activeImage.caption ? (
                  <p className="text-foreground/75 truncate">
                    {activeImage.caption}
                  </p>
                ) : null}
                {activeImage.source?.label ? (
                  sourceHref ? (
                    <a
                      href={sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground/80 flex min-w-0 items-center gap-1 truncate transition-colors"
                    >
                      <span className="truncate">
                        {activeImage.source.label}
                      </span>
                      <ExternalLinkIcon
                        aria-hidden
                        className="size-3 shrink-0"
                      />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground truncate">
                      {activeImage.source.label}
                    </span>
                  )
                ) : null}
              </div>
              <span className={cn(mono, "text-muted-foreground shrink-0")}>
                {index + 1} / {images.length}
              </span>
              <button
                type="button"
                aria-label="Next image"
                disabled={index === images.length - 1}
                onClick={() => setActiveId(images[index + 1]?.id ?? null)}
                className={cn(
                  ghostButton,
                  "size-8 shrink-0 disabled:pointer-events-none disabled:opacity-30",
                )}
              >
                <ChevronRightIcon aria-hidden className="size-4" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
