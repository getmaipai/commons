import { Skeleton } from "@/kit/ui/skeleton";

// Lane 10 item 2's real code-splitting: `App.tsx` wraps every lazy
// route in a `Suspense` boundary, and this is its fallback, so a chunk
// still downloading never shows a blank screen. Also `AsyncState.tsx`'s
// own loading state (a data fetch, not a chunk load) - one definition
// of "three skeleton bars means loading" instead of two copies that can
// drift apart.
//
// It stays invisible for its first 200 ms (`route-skeleton-in` in tokens.css), so a load that finishes quickly (a page the person just
// opened, a section a click away) never blinks a skeleton across the whole panel, and a slow one still shows it.
export const ROUTE_SKELETON_DELAY_MS = 200;

export function RouteSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3 p-4" role="status" aria-label={label} style={{ opacity: 0, animation: `route-skeleton-in 0s linear ${ROUTE_SKELETON_DELAY_MS}ms forwards` }}>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-3/4" />
    </div>
  );
}
