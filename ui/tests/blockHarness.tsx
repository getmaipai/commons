// UI-BLOCKS-01: what the five block tests share. A node is read from the example page in spec/ui/pages (so the page and the renderer
// cannot drift apart), the hub is a fetch mock that answers package data calls and records every other call, and the page state is a
// real writer whose value the test can read from the `state` test id.
import { mock } from "bun:test";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { renderWithQueryClient } from "./renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";

export interface Call { url: string; method: string; body: unknown }
export const calls: Call[] = [];

/** The first node of `spec/ui/pages/<file>`, parsed through the kit's own schema, with `change` merged over it. */
export function fixtureNode(file: string, change: Record<string, unknown> = {}): UiNode {
  const page = JSON.parse(readFileSync(new URL(`../../spec/ui/pages/${file}`, import.meta.url), "utf8")) as { body: Record<string, unknown>[] };
  return parseNode({ ...page.body[0], ...change });
}
export function parseNode(node: Record<string, unknown>): UiNode {
  return PageNodeSchema.parse({ type: "page", id: "p", title: "P", body: [node] }).body[0] as UiNode;
}

/** Answers `/api/plugins/<pkg>/data/<name>` with `data[name]` (a function is called each time; a Promise or `"hang"` never settles on its own);
 * any other request is recorded in `calls` and answered `{ ok: true }`. A data name set to `"fail"` answers 500. */
export function hub(data: Record<string, unknown | (() => unknown)>) {
  calls.length = 0;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const name = /\/data\/([a-z-]+)$/.exec(url)?.[1];
    if (name !== undefined && name in data) {
      const value = data[name];
      if (value === "hang") return new Promise<Response>(() => {});
      if (value === "fail") return Promise.resolve(new Response(JSON.stringify({ error: "no" }), { status: 500 }));
      return Promise.resolve(new Response(JSON.stringify(typeof value === "function" ? (value as () => unknown)() : value)));
    }
    calls.push({ url, method: init?.method ?? "GET", body });
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  }) as unknown as typeof fetch;
}

function Where() {
  const here = useLocation();
  return <output data-testid="where">{JSON.stringify({ path: here.pathname, state: here.state })}</output>;
}

/** Draws `node` the way a package page does: package scope, a page-state writer, a router. */
export function mountBlock(node: UiNode, options: { packageId?: string; state?: Record<string, unknown>; at?: string; host?: MediaHost | null } = {}) {
  const packageId = options.packageId ?? "videos";
  function Page() {
    const [state, setState] = useState<Record<string, unknown>>(options.state ?? {});
    return (
      <PageStateContext.Provider value={{ merge: (patch) => setState((old) => { const next = { ...old, ...patch }; for (const [k, v] of Object.entries(patch)) if (v === undefined) delete next[k]; return next; }) }}>
        <output data-testid="state">{JSON.stringify(state)}</output>
        <NodeRenderer node={node} state={state} />
      </PageStateContext.Provider>
    );
  }
  const view = renderWithQueryClient(
    <MemoryRouter initialEntries={[options.at ?? `/apps/${packageId}`]}>
      <PackageScopeContext.Provider value={{ packageId }}>
        <MediaHostContext.Provider value={options.host ?? null}><Page /></MediaHostContext.Provider>
      </PackageScopeContext.Provider>
      <Where />
    </MemoryRouter>,
  );
  return {
    ...view,
    state: () => JSON.parse(view.getByTestId("state").textContent ?? "{}") as Record<string, unknown>,
    where: () => JSON.parse(view.getByTestId("where").textContent ?? "{}") as { path: string; state: { pageState?: Record<string, unknown> } | null },
  };
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
