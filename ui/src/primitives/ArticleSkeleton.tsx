import { Skeleton } from "@/kit/ui/skeleton";
import { ROUTE_SKELETON_DELAY_MS } from "@/kit/primitives/RouteSkeleton";

export function ArticleSkeleton({ label = "Loading article" }: { label?: string }) {
  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-[72ch] flex-col gap-4 px-4 md:px-6 pt-6"
      role="status"
      aria-label={label}
      style={{ opacity: 0, animation: `route-skeleton-in 0s linear ${ROUTE_SKELETON_DELAY_MS}ms forwards` }}
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-4/5" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
