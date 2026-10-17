import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Page } from "@/kit/primitives/Page";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext, PageStateContext, type PageStateWriter } from "@/kit/schema/packageScope";
import { PageNodeSchema } from "@/kit/schema/types";
import { cn, FOCUS_RING } from "@/kit/utils";

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
}: {
  page: unknown;
  beforeBody?: ReactNode;
  packageId?: string;
  hideTitle?: boolean;
}) {
  const parsed = PageNodeSchema.parse(page);
  // NEWS-00: a `navigate` action's `state` arrives as router state and is written into this page's state (a channel
  // page reads its kind and key this way). Applied on arrival and again whenever the navigation changes.
  const location = useLocation();
  const arrived = (location.state as { pageState?: Record<string, unknown> } | null)?.pageState;
  const [state, setState] = useState<Record<string, unknown>>(arrived ?? {});
  useEffect(() => {
    if (arrived) setState((prev) => ({ ...prev, ...arrived }));
  }, [location.key, arrived]);
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
        <Page title={parsed.title} hideTitle={hideTitle} tone={parsed.tone}>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a keyboard-scrollable region, not a widget (DetailPane.tsx's own precedent). */}
          <div tabIndex={0} className={cn("flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4", FOCUS_RING)}>
            {beforeBody}
            <NodeRenderer node={parsed} state={state} />
          </div>
        </Page>
      </PageStateContext.Provider>
    </PackageScopeContext.Provider>
  );
}
