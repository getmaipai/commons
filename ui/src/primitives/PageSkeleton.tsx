import { Skeleton } from "@/kit/ui/skeleton";
import { i18n } from "@/kit/i18n";
import { ROUTE_SKELETON_DELAY_MS } from "./RouteSkeleton";

// The loading shape of a media page: one wide hero box and rows of tile boxes, so the page keeps its layout while data arrives and
// nothing jumps when it does. Same 200 ms hold as RouteSkeleton, so a fast load never flashes boxes.
// A box is a few percent of the text colour over the page, so it reads on every Look (the default accent fill matches the dark surfaces).
const box = "bg-foreground/[0.08]";
const hold = { opacity: 0, animation: `route-skeleton-in 0s linear ${ROUTE_SKELETON_DELAY_MS}ms forwards` } as const;

export function ShelfSkeleton({ tiles = 6, label = i18n._({ id: "ui.Loading", message: "Loading" }) }: { tiles?: number; label?: string }) {
  return (
    <div data-slot="shelf-skeleton" role="status" aria-label={label} className="flex flex-col gap-3" style={hold}>
      <Skeleton className={`h-4 w-32 ${box}`} />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: tiles }, (_, index) => <Skeleton key={index} className={`aspect-[3/4] w-36 shrink-0 rounded-[var(--radius-thumb,8px)] ${box}`} />)}
      </div>
    </div>
  );
}

export function PageSkeleton({ shelves = 2, label = i18n._({ id: "ui.Loading", message: "Loading" }) }: { shelves?: number; label?: string }) {
  return (
    <div data-slot="page-skeleton" role="status" aria-label={label} className="flex flex-col gap-6 p-4" style={hold}>
      <Skeleton className={`aspect-[21/9] max-h-64 w-full rounded-[var(--radius-card,12px)] ${box}`} />
      {Array.from({ length: shelves }, (_, index) => <ShelfSkeleton key={index} label={label} />)}
    </div>
  );
}
