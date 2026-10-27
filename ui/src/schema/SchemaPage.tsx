import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Page } from "@/kit/primitives/Page";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext, PageSidebarContext, PageStateContext, type PageStateWriter } from "@/kit/schema/packageScope";
import { PageNodeSchema } from "@/kit/schema/types";
import { cn, FOCUS_RING } from "@/kit/utils";

function typedStateKeys(node: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(node)) { for (const child of node) typedStateKeys(child, found); return found; }
  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (record.type === "search" && typeof record.state === "string") found.add(record.state);
    for (const child of Object.values(record)) typedStateKeys(child, found);
  }
  return found;
}

/** Renders a `spec/ui/pages/*.json` document (imported as a plain JSON
 * module - Vite resolves `.json` imports at build time, no fetch, no
 * runtime file I/O). Parsing through PageNodeSchema (not just trusting
 * the import's TS shape) is deliberate: it's the same page.json that
 * ajv already validated in spec/tests/ts/ui-schema.test.ts, but that
 * suite runs at `spec`'s own `check.sh` time - a frontend build has no
 * guarantee it ran, or ran against the same file, so this is the
 * frontend's own independent proof the page it's about to render is
 * shaped the way NodeRenderer.tsx expects.
 *
 * `beforeBody` is an escape hatch for exactly one real need (Memory's
 * "Showing N / Show all" banner, MemoryPage.tsx): a page-instance
 * concern (a URL query param) that isn't part of the page's own
 * declarative structure, rendered inside the same scrollable body a
 * sibling of `<SchemaPage>` couldn't reach.
 *
 * APP-KIND-02: `packageId` marks a package's own page. It mounts the package scope
 * (a binding and a call reach only that package, navigation stays inside its app) and
 * the page state a picker writes, which this component owns and hands to every node. */
export function SchemaPage({
  page,
  beforeBody,
  packageId,
  hideTitle,
  sidebar,
  floatingBar,
}: {
  page: unknown;
  beforeBody?: ReactNode;
  packageId?: string;
  hideTitle?: boolean;
  /** The app draws its own sidebar column beside this page: the page's plain search box gives way to it from `lg` up. */
  sidebar?: boolean;
  /** A floating bar (PhoneNav's floating variant) sits over the bottom of this page: the page scrolls to the screen edge and ends with room for the bar. */
  floatingBar?: boolean;
}) {
  const parsed = PageNodeSchema.parse(page);
  // NEWS-00: a `navigate` action's `state` arrives as router state and is written into this page's state (a channel
  // page reads its kind and key this way). Applied on arrival and again whenever the navigation changes.
  const location = useLocation();
  const arrived = (location.state as { pageState?: Record<string, unknown> } | null)?.pageState;
  const navigate = useNavigate();
  // Text a person is still typing into a search box is not a choice yet: it joins the address only when it is submitted (the navigation's own state).
  const typedKeys = useMemo(() => typedStateKeys(page), [page]);
  const [state, setState] = useState<Record<string, unknown>>(() => ({ ...(packageId ? Object.fromEntries(new URLSearchParams(location.search)) : {}), ...arrived }));
  useEffect(() => {
    if (arrived) setState((prev) => ({ ...prev, ...arrived }));
  }, [location.key, arrived]);
  // APP-URL-02: a package page's own choices (a topic chip, a tab, a picked place) are written into its address, replacing the entry in
  // place, so the page as it is shown reloads, shares and goes back the same. The arrival state carries the same values, so the shell
  // does not treat the new address as a different page. Only plain text values are kept; an empty choice leaves the address clean.
  useEffect(() => {
    if (!packageId) return;
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(state)) if (typeof value === "string" && value !== "" && !typedKeys.has(name)) params.set(name, value);
    params.sort();
    const wanted = params.toString();
    const current = new URLSearchParams(location.search);
    current.sort();
    if (wanted === current.toString()) return;
    navigate(`${location.pathname}${wanted ? `?${wanted}` : ""}`, { replace: true, state: { ...(location.state as object | null), pageState: Object.fromEntries(params) } });
  }, [packageId, state, typedKeys, location.pathname, location.search, location.state, navigate]);
  // Choosing a chip, tab or place shows a different list: start it from the top. The first render keeps its place.
  const scroller = useRef<HTMLDivElement>(null);
  const chosen = useRef<string | null>(null);
  useEffect(() => {
    if (!packageId) return;
    const key = new URLSearchParams(Object.entries(state).filter(([name, value]) => typeof value === "string" && value !== "" && !typedKeys.has(name)) as [string, string][]).toString();
    if (chosen.current !== null && chosen.current !== key) scroller.current?.scrollTo({ top: 0 });
    chosen.current = key;
  }, [packageId, state, typedKeys]);
  const writer = useMemo<PageStateWriter>(
    () => ({
      merge: (patch) =>
        setState((prev) => {
          const next = { ...prev };
          for (const [name, value] of Object.entries(patch)) {
            if (value === undefined) delete next[name];
            else next[name] = value;
          }
          return next;
        }),
    }),
    [],
  );
  const scope = useMemo(() => (packageId ? { packageId } : null), [packageId]);
  return (
    <PackageScopeContext.Provider value={scope}>
      <PageStateContext.Provider value={writer}>
       <PageSidebarContext.Provider value={sidebar === true}>
        <Page title={parsed.title} hideTitle={hideTitle} tone={parsed.tone}>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a keyboard-scrollable region, not a widget (DetailPane.tsx's own precedent). */}
          <div ref={scroller} tabIndex={0} className={cn("flex min-w-0 flex-1 flex-col overflow-y-auto", FOCUS_RING)}>
            {/* The padding lives on this inner box, not on the scroller: a sticky child (the article toolbar) would otherwise stick
                at the padding's inner edge and let the text scroll through the gap above it. */}
            <div data-slot="schema-page-body" className={cn("flex min-w-0 flex-1 flex-col gap-6 p-4", floatingBar && "pb-24")}>
              {beforeBody}
              <NodeRenderer node={parsed} state={state} />
            </div>
          </div>
        </Page>
       </PageSidebarContext.Provider>
      </PageStateContext.Provider>
    </PackageScopeContext.Provider>
  );
}
