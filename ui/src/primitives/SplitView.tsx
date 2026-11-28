import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn, FOCUS_RING } from "@/kit/utils";

/** VIDEO-UI-03: how the enclosing main and aside form is laid out right now. `side` is the aside beside the main column when its
 * container has room for both columns; `stacked` is the aside under it. A part inside the aside that must change shape with
 * the layout (the `prompt_bar` panel and dock) reads this instead of running a media query of its own, so there is one definition
 * of the breakpoint. `null` outside a main and aside SplitView. */
export type SplitViewLayout = "side" | "stacked";
export const SplitViewLayoutContext = createContext<SplitViewLayout | null>(null);
export function useSplitViewLayout(): SplitViewLayout | null {
  return useContext(SplitViewLayoutContext);
}

const MAIN_MIN_WIDTH_PX = 520;
const GAP_WIDTH_PX = 28;
export function sideBySideFor(widthPx: number, asideWidth: number): boolean {
  return widthPx >= MAIN_MIN_WIDTH_PX + asideWidth + GAP_WIDTH_PX;
}
function useSideBySide(asideWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, side: width !== null && sideBySideFor(width, asideWidth) };
}

interface ListDetailProps {
  /** The index side: a List or a CardGrid, usually. */
  list: ReactNode;
  /** The detail side: a DetailPane, usually. Rendered even when nothing
   * is selected, so a caller can show its own "pick something" state on
   * the surfaces where both halves are visible at once. */
  detail: ReactNode;
  /** True when something is selected. Drives the phone swap: one column
   * on phone (docs/UI.md's density budget) means the list and the detail
   * take turns rather than sitting side by side. */
  detailOpen?: boolean;
  listLabel?: string;
  detailLabel?: string;
}

/** MEDIA-POLISH-01: the main and aside form: a wide column with a narrow one
 * beside it when the container can fit both at useful widths, otherwise stacked. */
interface MainAsideProps {
  main: ReactNode;
  aside: ReactNode;
  /** The aside column's accessible name ("Up next"). */
  asideLabel?: string;
  /** VIDEO-UI-03: the side the aside takes when columns fit. Default `end`; `start` puts it on the left (a control panel beside a feed).
   * Stacked, the aside stays under the main column either way. */
  asideSide?: "start" | "end";
  /** VIDEO-UI-12: the aside column's width when side by side. Default `default`, 360 px; `wide` is 420 px. Stacked, no effect. */
  asideWidth?: "default" | "wide";
  /** VIDEO-UI-13: `stage` draws the main column as a recessed pane on `--surface-stage`. Default `page`: no surface. */
  mainSurface?: "page" | "stage";
}

type SplitViewProps = ListDetailProps | MainAsideProps;

// docs/UI.md names SplitView as a kit primitive. It owns exactly one
// decision - how a list and a detail share the screen at each surface -
// and nothing else. Phone shows one at a time; tablet and desktop show
// both, the list narrower than the detail.
//
// The phone swap is CSS (`max-sm:hidden`), not a width measured in
// JavaScript: measuring would make the first paint wrong on a phone and
// would put a second, drifting definition of "phone" next to the kit's
// own (@/kit/responsive). The caller only ever says whether something is
// selected.
export function SplitView(props: SplitViewProps) {
  if ("main" in props) return <MainAside {...props} />;
  return <ListDetail {...props} />;
}

function MainAside({ main, aside, asideLabel, asideSide = "end", asideWidth = "default", mainSurface = "page" }: MainAsideProps) {
  const start = asideSide === "start";
  const wide = asideWidth === "wide";
  const asideWidthPx = wide ? 420 : 360;
  const { ref, side } = useSideBySide(asideWidthPx);
  const columns = start
    ? (wide ? "grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : "grid-cols-[minmax(0,360px)_minmax(0,1fr)]")
    : (wide ? "grid-cols-[minmax(0,1fr)_minmax(0,420px)]" : "grid-cols-[minmax(0,1fr)_minmax(0,360px)]");
  return (
    <SplitViewLayoutContext.Provider value={side ? "side" : "stacked"}>
      <div
        ref={ref}
        className={cn("grid w-full min-w-0 gap-x-7 gap-y-6", side ? columns : "grid-cols-1")}
        data-slot="split-view"
        data-layout="main-aside"
        data-aside-side={asideSide}
        data-aside-width={asideWidth}
      >
        <div data-surface={mainSurface === "stage" ? "stage" : undefined} className={cn("flex min-w-0 flex-col gap-4", mainSurface === "stage" && "rounded-2xl border border-border bg-[var(--surface-stage)] p-4 text-foreground sm:p-5")}>{main}</div>
        <div role={asideLabel ? "region" : undefined} aria-label={asideLabel} className={cn("flex min-w-0 flex-col gap-4", side && start && "order-first")}>
          {aside}
        </div>
      </div>
    </SplitViewLayoutContext.Provider>
  );
}

function ListDetail({ list, detail, detailOpen = false, listLabel, detailLabel }: ListDetailProps) {
  return (
    <div className="flex h-full min-h-0 w-full">
      <div
        // A label only means something on a labelled region; an
        // aria-label on a bare div is ignored by every screen reader.
        role={listLabel ? "region" : undefined}
        aria-label={listLabel}
        // A tab stop for the same reason DetailPane's body has one: this
        // column scrolls, and Safari will not focus it on its own.
        tabIndex={0}
        className={cn(
          "flex min-h-0 min-w-0 flex-col overflow-y-auto",
          FOCUS_RING,
          "w-full sm:w-2/5 sm:border-r sm:border-[var(--border)] lg:w-1/3",
          detailOpen && "max-sm:hidden",
        )}
      >
        {list}
      </div>
      <div
        role={detailLabel ? "region" : undefined}
        aria-label={detailLabel}
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          !detailOpen && "max-sm:hidden",
        )}
      >
        {detail}
      </div>
    </div>
  );
}
