// APP-KIND-02: the package scope guard, the package binding, answer_blocks and picker.
import { describe, expect, test, mock, afterEach, beforeEach } from "bun:test";
import { act, cleanup, fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import weatherCard from "@maipai/spec/fixtures/answer-block/valid-weather_card.json";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { createQueryClient } from "@/kit/queryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { SchemaPage } from "@/kit/schema/SchemaPage";
import { useDispatchAction } from "@/kit/schema/actions";
import { PackageScopeContext, resolveParams, underAppRoute, underPluginApi } from "@/kit/schema/packageScope";
import type { UiNode } from "@/kit/schema/types";

afterEach(cleanup);

interface Call { url: string; method: string; body: unknown }
let calls: Call[] = [];
const originalFetch = globalThis.fetch;
let dataBody: unknown = { as_of: "2026-10-17T12:00:00Z", blocks: [weatherCard] };

beforeEach(() => {
  calls = [];
  dataBody = { as_of: "2026-10-17T12:00:00Z", blocks: [weatherCard] };
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.includes("/data/places")) {
      return Promise.resolve(new Response(JSON.stringify({ as_of: "x", rows: [{ id: "pl1", label: "Grandma's house" }] }), { status: 200 }));
    }
    if (url.includes("/data/")) return Promise.resolve(new Response(JSON.stringify(dataBody), { status: 200 }));
    if (url.includes("/api/plugins/demo/")) return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    return Promise.resolve(new Response(JSON.stringify([{ id: "a" }]), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const blocksNode: UiNode = {
  type: "answer_blocks",
  bind: { source: "package", path: "forecast", stream: false, params: { place: "$state.place", current: "$state.place_geo" } },
  empty_state: { type: "empty_state", icon: "cloud-off", text: "No weather right now." },
};

function inScope(node: UiNode, state?: Record<string, unknown>, packageId: string | null = "demo") {
  return renderWithQueryClient(
    <MemoryRouter>
      <PackageScopeContext.Provider value={packageId ? { packageId } : null}>
        <NodeRenderer node={node} state={state} />
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );
}

describe("scope helpers", () => {
  test("underPluginApi and underAppRoute accept only the package's own prefix", () => {
    expect(underPluginApi("/api/plugins/demo/data/x", "demo")).toBe(true);
    expect(underPluginApi("/api/plugins/demo", "demo")).toBe(true);
    expect(underPluginApi("/api/plugins/demox/data/x", "demo")).toBe(false);
    expect(underPluginApi("/api/people", "demo")).toBe(false);
    expect(underPluginApi("/api/plugins/demo/../../people", "demo")).toBe(false);
    expect(underPluginApi("/api/plugins/demo/%2e%2e/people", "demo")).toBe(false);
    expect(underAppRoute("/apps/demo/forecast", "demo")).toBe(true);
    expect(underAppRoute("/apps/demo2", "demo")).toBe(false);
    expect(underAppRoute("/settings", "demo")).toBe(false);
  });

  test("resolveParams fills $state, drops unset values and keeps coordinates out of the key", () => {
    const state = { place: "pl1", place_geo: { lat: 47.61, lon: -122.33 }, place_geo_n: 2 };
    const out = resolveParams({ place: "$state.place", current: "$state.place_geo", missing: "$state.nope", fixed: 5 }, state);
    expect(out.body).toEqual({ place: "pl1", current: { lat: 47.61, lon: -122.33 }, fixed: 5 });
    expect(out.keyParams).toEqual({ place: "pl1", fixed: 5 });
    expect(out.nonces).toEqual([2]);
    expect(JSON.stringify(out.keyParams)).not.toContain("47.61");
  });
});

describe("package scope guard", () => {
  test("a route binding outside the package is refused and nothing is fetched", async () => {
    const node: UiNode = { type: "list", bind: { source: "route", path: "/api/people", stream: false }, item_key_field: "id", item_label_field: "id" };
    const { findByText } = inScope(node);
    await findByText("Could not load this list.");
    expect(calls).toHaveLength(0);
  });

  test("a package binding outside any package page is refused", async () => {
    const { findByText } = inScope(blocksNode, {}, null);
    await findByText("No weather right now.");
    expect(calls).toHaveLength(0);
  });

  test("outside a package page a route binding still works as before", async () => {
    const node: UiNode = { type: "list", bind: { source: "route", path: "/api/memory", stream: false }, item_key_field: "id", item_label_field: "id" };
    const { findByText } = inScope(node, {}, null);
    await findByText("a");
    expect(calls[0]?.url).toBe("/api/memory");
  });

  test("a refused binding does not write into the cache entry another page holds", async () => {
    const client = createQueryClient();
    client.setQueryData(["schema-binding", "/api/people"], [{ id: "kept" }]);
    const node: UiNode = { type: "list", bind: { source: "route", path: "/api/people", stream: false }, item_key_field: "id", item_label_field: "id" };
    const view = (
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PackageScopeContext.Provider value={{ packageId: "demo" }}>
            <NodeRenderer node={node} />
          </PackageScopeContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    const { findByText } = render(view);
    await findByText("Could not load this list.");
    expect(client.getQueryData<unknown>(["schema-binding", "/api/people"])).toEqual([{ id: "kept" }]);
  });

  function dispatchInScope(packageId: string | null) {
    const client = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PackageScopeContext.Provider value={packageId ? { packageId } : null}>{children}</PackageScopeContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    return renderHook(() => useDispatchAction(), { wrapper });
  }

  test("a DELETE to another route is refused inside the scope and runs outside it", async () => {
    const inside = dispatchInScope("demo");
    act(() => inside.result.current.dispatch({ call: { target: "/api/people/x", method: "DELETE" } }));
    await waitFor(() => expect(inside.result.current.lastError).toBe("This page can't do that."));
    expect(calls).toHaveLength(0);
    const outside = dispatchInScope(null);
    act(() => outside.result.current.dispatch({ call: { target: "/api/people/x", method: "DELETE" } }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/people/x" && c.method === "DELETE")).toBe(true));
  });

  test("a call under the package's own prefix runs, and navigation outside its app is refused", async () => {
    const hook = dispatchInScope("demo");
    act(() => hook.result.current.dispatch({ call: { target: "/api/plugins/demo/data/refresh" } }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/demo/data/refresh")).toBe(true));
    act(() => hook.result.current.dispatch({ navigate: { to: "/settings" } }));
    await waitFor(() => expect(hook.result.current.lastError).toBe("This page can't do that."));
  });
});

describe("answer_blocks", () => {
  test("posts params to the package's data route and draws the block through the dispatcher", async () => {
    const { container, queryClient } = inScope(blocksNode, { place: "pl1" });
    await waitFor(() => expect(container.querySelector('[data-slot="weather-card"]')).not.toBeNull());
    expect(calls[0]).toEqual({ url: "/api/plugins/demo/data/forecast", method: "POST", body: { place: "pl1" } });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
  });

  test("every block is drawn wide", async () => {
    const { container } = inScope(blocksNode, { place: "pl1" });
    await waitFor(() => expect(container.querySelector('[data-slot="weather-card"]')).not.toBeNull());
    expect(container.querySelector('[data-slot="weather-card"]')?.getAttribute("data-variant")).toBe("wide");
  });

  test("coordinates ride the body but never the query key", async () => {
    const { container, queryClient } = inScope(blocksNode, { place: "current", place_geo: { lat: 47.61, lon: -122.33 }, place_geo_n: 1 });
    await waitFor(() => expect(container.querySelector('[data-slot="weather-card"]')).not.toBeNull());
    expect(calls[0]?.body).toEqual({ place: "current", current: { lat: 47.61, lon: -122.33 } });
    const keys = JSON.stringify(queryClient.getQueryCache().getAll().map((q) => q.queryKey));
    expect(keys).not.toContain("47.61");
    expect(keys).not.toContain("-122.33");
  });

  test("an unknown block kind falls back to its alt sentence", async () => {
    dataBody = { as_of: "x", blocks: [{ id: "b1", kind: "hologram", alt: "A hologram of the forecast." }] };
    const { findByText } = inScope(blocksNode);
    await findByText("A hologram of the forecast.");
  });

  test("kinds draws only the named kinds", async () => {
    dataBody = { as_of: "x", blocks: [weatherCard, { id: "b2", kind: "hologram", alt: "Hidden alt." }] };
    const { container, queryByText } = inScope({ ...blocksNode, kinds: ["weather_card"] } as UiNode);
    await waitFor(() => expect(container.querySelector('[data-slot="weather-card"]')).not.toBeNull());
    expect(queryByText("Hidden alt.")).toBeNull();
  });

  test("no blocks shows the page's own empty state; a failure shows it with a retry", async () => {
    dataBody = { as_of: "x", blocks: [], degraded: true };
    const first = inScope(blocksNode);
    await first.findByText("No weather right now.");
    cleanup();
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({ error: "down" }), { status: 502 }))) as unknown as typeof fetch;
    const second = inScope(blocksNode);
    await second.findByText("No weather right now.");
    expect(second.getByRole("button", { name: /try again|retry/i })).toBeTruthy();
  });
});

describe("picker and page state", () => {
  const page = {
    type: "page",
    id: "demo",
    title: "Demo",
    body: [
      {
        type: "picker",
        state: "place",
        label: "Place",
        placeholder: "Default place",
        leading: [{ value: "current", label: "Current location", icon: "locate-fixed", needs: "geolocation" }],
        bind: { source: "package", path: "places" },
        item_key_field: "id",
        item_label_field: "label",
      },
      blocksNode,
      { type: "section", heading: "Using your location", condition: "place == 'current'", children: [{ type: "empty_state", icon: "map-pin", text: "Showing where you are." }] },
    ],
  };

  function renderPage() {
    return renderWithQueryClient(
      <MemoryRouter>
        <SchemaPage page={page} packageId="demo" />
      </MemoryRouter>,
    );
  }

  async function choose(view: ReturnType<typeof renderPage>, name: string) {
    const trigger = view.getByRole("combobox", { name: "Place" });
    act(() => {
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
    });
    const option = await view.findByRole("option", { name });
    act(() => {
      fireEvent.keyDown(option, { key: "Enter" });
    });
  }

  test("the saved places come from the package's rows and choosing one refetches with it", async () => {
    const view = renderPage();
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/demo/data/places")).toBe(true));
    await choose(view, "Grandma's house");
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/data/forecast") && (c.body as { place?: string }).place === "pl1")).toBe(true));
  });

  test("Current location asks the browser only on that choice, then sends the coordinates in the body", async () => {
    const getCurrentPosition = mock((ok: (p: { coords: { latitude: number; longitude: number } }) => void) => ok({ coords: { latitude: 47.6101, longitude: -122.3301 } }));
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
    const view = renderPage();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await choose(view, "Current location");
    await waitFor(() => expect(calls.some((c) => (c.body as { current?: unknown } | undefined)?.current !== undefined)).toBe(true));
    const withCoords = calls.find((c) => (c.body as { current?: unknown } | undefined)?.current !== undefined)!;
    expect(withCoords.body).toEqual({ place: "current", current: { lat: 47.61, lon: -122.33 } });
    expect(withCoords.url).not.toContain("47.61");
    await view.findByText("Showing where you are.");
    const keys = JSON.stringify(view.queryClient.getQueryCache().getAll().map((q) => q.queryKey));
    expect(keys).not.toContain("47.61");
  });

  test("a refused location says so in plain words and changes nothing", async () => {
    const getCurrentPosition = mock((_ok: unknown, fail: () => void) => fail());
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
    const view = renderPage();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    await choose(view, "Current location");
    await view.findByText("Location is off for this site. Choose a saved place instead.");
    expect(view.queryByText("Showing where you are.")).toBeNull();
  });
});
