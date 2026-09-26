import { useState } from "react";
import { AspectRatio } from "@/kit/dashboard/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogTitle } from "@/kit/dashboard/components/ui/dialog";
import { Card } from "@/kit/primitives/Card";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { GRID_COLUMNS } from "@/kit/responsive";
import { useSurface } from "@/kit/useSurface";

export interface MediaGridItem {
  id: string;
  thumbnailUrl: string;
  mediaType: "image" | "video";
  altText: string;
}

interface MediaGridProps {
  items: readonly MediaGridItem[];
  emptyMessage: string;
}

/** A responsive, content-agnostic grid of media thumbnails with a shared
 * image/video lightbox. */
export function MediaGrid({ items, emptyMessage }: MediaGridProps) {
  const [selectedItem, setSelectedItem] = useState<MediaGridItem | null>(null);
  const { far } = useSurface();

  if (items.length === 0) return <EmptyState icon="camera" text={emptyMessage} />;

  return (
    <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
      <>
        <ul aria-label="Media" className={`grid list-none gap-3 p-0 ${GRID_COLUMNS.default}`}>
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              <Card onSelect={() => setSelectedItem(item)} label={`Open media: ${item.altText}`} far={far}>
                <AspectRatio ratio={4 / 3} className="bg-muted">
                  {item.mediaType === "image" ? (
                    <img src={item.thumbnailUrl} alt="" className="size-full object-cover" />
                  ) : (
                    // This preview is muted and decorative. MediaGridItem carries no caption-track URL.
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      src={item.thumbnailUrl}
                      muted
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                      className="size-full object-cover"
                    />
                  )}
                </AspectRatio>
              </Card>
            </li>
          ))}
        </ul>
        {selectedItem ? (
          <DialogContent className="max-h-[90dvh] w-[min(96vw,80rem)] max-w-none p-3 sm:max-w-none">
            <DialogTitle className="sr-only">{selectedItem.altText}</DialogTitle>
            <div className="flex max-h-[calc(90dvh-1.5rem)] items-center justify-center overflow-hidden">
              {selectedItem.mediaType === "image" ? (
                <img
                  src={selectedItem.thumbnailUrl}
                  alt={selectedItem.altText}
                  className="max-h-[calc(90dvh-3rem)] max-w-full object-contain"
                />
              ) : (
                // Caption tracks are not part of the requested item shape; altText names the video.
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={selectedItem.thumbnailUrl}
                  controls
                  autoPlay
                  playsInline
                  aria-label={selectedItem.altText}
                  className="max-h-[calc(90dvh-3rem)] max-w-full"
                />
              )}
            </div>
          </DialogContent>
        ) : null}
      </>
    </Dialog>
  );
}
