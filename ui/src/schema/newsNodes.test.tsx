// NEWS-00 / NEWS-01: the interpreter side of the News page nodes: tabs, a list's media and toggle, the answer_blocks
// actions map, and a navigate action's state.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import feedBlock from "@maipai/spec/fixtures/answer-block/valid-story_feed.json";
import articleBlock from "@maipai/spec/fixtures/answer-block/valid-article.json";
import followingPage from "@maipai/spec/ui/pages/news-following.json";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { SchemaPage } from "@/kit/schema/SchemaPage";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";

afterEach(cleanup);

interface Call { url: string; method: string; body: unknown }
let calls: Call[] = [];
let dataBody: unknown;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  dataBody = { as_of: "2026-10-17T13:00:00Z", blocks: [feedBlock] };
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.includes("/data/topics")) return Promise.resolve(new Response(JSON.stringify([{ key: "science", label: "Science", icon: "globe", followed: false, count: 4 }, { key: "world", label: "World", icon: "/icons/world.svg", followed: true, count: 9 }]), { status: 200 }));
    if (url.includes("/data/sources")) return Promise.resolve(new Response(JSON.stringify([{ key: "feed-abc123", label: "Example Wire", icon: "newspaper", followed: false, site: "example.com" }]), { status: 200 }));
    if (url.includes("/data/")) return Promise.resolve(new Response(JSON.stringify(dataBody), { status: 200 }));
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function inNews(node: UiNode, initial = "/apps/news") {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[initial]}>
      <PackageScopeContext.Provider value={{ packageId: "news" }}>
        <NodeRenderer node={node} state={{}} />
        <Where />
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );
}
function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.pathname + location.search}</output>;
}

const P = "/api/plugins/news/actions/";
const tabsNode = (followingPage as unknown as { body: UiNode[] }).body[0]!;

describe("tabs", () => {
  test("shows the first tab, switches by the URL query and keeps the other tab's list unmounted", async () => {
    const { findByText, getByRole, getByTestId, queryByText } = inNews(tabsNode);
    await findByText("Science");
    expect(queryByText("Example Wire")).toBeNull();
    const sources = getByRole("tab", { name: "Sources" });
    fireEvent.pointerDown(sources, { button: 0 });
    fireEvent.mouseDown(sources, { button: 0 });
    fireEvent.click(sources);
    await findByText("Example Wire");
    expect(getByTestId("where").textContent).toContain("tab=sources");
    expect(queryByText("Science")).toBeNull();
  });

  test("an unknown tab id in the URL falls back to the first tab", async () => {
    const { findByText } = inNews(tabsNode, "/apps/news/following?tab=nope");
    await findByText("Science");
  });
});

describe("list media and toggle", () => {
  test("a bundled icon name and a same-origin path draw; the toggle labels follow the row and fire with `on` flipped", async () => {
    const { findByText, container } = inNews(tabsNode);
    await findByText("Science");
    expect(container.querySelector("img[src='/icons/world.svg']")).not.toBeNull();
    fireEvent.click(await findByText("Follow"));
    await waitFor(() => expect(calls.some((c) => c.url === `${P}follow`)).toBe(true));
    expect(calls.find((c) => c.url === `${P}follow`)?.body).toEqual({ kind: "topic", key: "science", on: true });
    fireEvent.click(await findByText("Following"));
    await waitFor(() => expect(calls.filter((c) => c.url === `${P}follow`)).toHaveLength(2));
    expect(calls.filter((c) => c.url === `${P}follow`)[1]?.body).toEqual({ kind: "topic", key: "world", on: false });
  });

  test("an address with a host is never loaded as a row picture", async () => {
    dataBody = null;
    const node: UiNode = { type: "list", bind: { source: "package", path: "topics", stream: false }, item_key_field: "key", item_label_field: "label", item_media_field: "bad" };
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = String(input);
      calls.push({ url, method: "POST", body: undefined });
      return Promise.resolve(new Response(JSON.stringify([{ key: "a", label: "Alpha", bad: "https://evil.example/p.png" }, { key: "b", label: "Beta", bad: "//evil.example/p.png" }]), { status: 200 }));
    }) as unknown as typeof fetch;
    const { findByText, container } = inNews(node);
    await findByText("Alpha");
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("answer_blocks actions map", () => {
  const node: UiNode = {
    type: "answer_blocks",
    bind: { source: "package", path: "today", stream: false },
    actions: {
      open: { navigate: { to: "/apps/news/story", state: { id: "{story_id}" } } },
      save: { call: { target: `${P}save`, args: { item_id: "{item_id}", on: "{on}" } } },
      reset_mix: { confirm: { prompt: "Reset My Mix?", on_confirm: { call: { target: `${P}reset_mix` } } } },
    },
  };

  test("opening a story navigates with the story's ids as page state, inside the app", async () => {
    const { findByText, getByTestId } = inNews(node);
    fireEvent.click(await findByText("Headline 1"));
    await waitFor(() => expect(getByTestId("where").textContent).toBe("/apps/news/story"));
  });

  test("Save calls the declared route with the story's ids and the new value", async () => {
    const { findAllByLabelText, findByText } = inNews({ ...node, actions: { ...node.actions!, } } as UiNode);
    fireEvent.pointerDown((await findAllByLabelText(/More for/))[0]!, { button: 0 });
    fireEvent.click((await findAllByLabelText(/More for/))[0]!);
    const save = await findByText("Save");
    fireEvent.click(save);
    await waitFor(() => expect(calls.some((c) => c.url === `${P}save`)).toBe(true));
    expect(calls.find((c) => c.url === `${P}save`)?.body).toEqual({ item_id: feedBlock.props.hero.item_id, on: true });
  });

  test("a page that declares no actions draws a read-only feed: no menu, no Follow", async () => {
    const { findByText, queryAllByLabelText } = inNews({ type: "answer_blocks", bind: { source: "package", path: "today", stream: false } });
    await findByText("Headline 1");
    expect(queryAllByLabelText(/More for/)).toHaveLength(0);
  });

  test("an action pointing outside the package is refused, as every package action is", async () => {
    const evil: UiNode = { ...node, actions: { save: { call: { target: "/api/people/x", args: {} } } } } as UiNode;
    const { findAllByLabelText, findByText, findByText: find2 } = inNews(evil);
    fireEvent.click((await findAllByLabelText(/More for/))[0]!);
    fireEvent.click(await findByText("Save"));
    await find2("This page can't do that.");
    expect(calls.some((c) => c.url === "/api/people/x")).toBe(false);
  });

  test("the article block draws through the same map", async () => {
    dataBody = { as_of: "2026-10-17T13:00:00Z", blocks: [articleBlock] };
    const articleNode: UiNode = { type: "answer_blocks", bind: { source: "package", path: "story", stream: false }, actions: { save: { call: { target: `${P}save` } } } };
    const { findByText } = inNews(articleNode);
    fireEvent.click(await findByText("Save"));
    await waitFor(() => expect(calls.some((c) => c.url === `${P}save`)).toBe(true));
  });
});

describe("navigate state arrives as page state", () => {
  test("SchemaPage seeds its state from the router state a navigate action sent", async () => {
    const page = PageNodeSchema.parse({ type: "page", id: "c", title: "Channel", body: [{ type: "answer_blocks", bind: { source: "package", path: "channel", params: { key: "$state.key" } } }] });
    renderWithQueryClient(
      <MemoryRouter initialEntries={[{ pathname: "/apps/news/channel", state: { pageState: { kind: "topic", key: "science" } } }]}>
        <SchemaPage page={page} packageId="news" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/data/channel"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/data/channel"))?.body).toEqual({ key: "science" });
  });
});

describe("answer_blocks filter_state (NEWS-LOOK-02)", () => {
  const page = PageNodeSchema.parse({
    type: "page",
    id: "t",
    title: "Today",
    body: [{ type: "answer_blocks", filter_state: "topic", bind: { source: "package", path: "today", params: { topic: "$state.topic" } } }],
  });
  const feedCalls = () => calls.filter((c) => c.url.endsWith("/data/today"));

  test("a chip writes its id to the page state, nothing is called, and the data call refetches with it", async () => {
    const { findByRole } = renderWithQueryClient(
      <MemoryRouter initialEntries={["/apps/news"]}>
        <SchemaPage page={page} packageId="news" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(feedCalls()).toHaveLength(1));
    expect(feedCalls()[0]!.body).toEqual({});
    const science = await findByRole("tab", { name: "Science" });
    fireEvent.pointerDown(science, { button: 0 });
    fireEvent.mouseDown(science, { button: 0 });
    fireEvent.click(science);
    await waitFor(() => expect(feedCalls()).toHaveLength(2));
    expect(feedCalls()[1]!.body).toEqual({ topic: "science" });
    expect(calls.filter((c) => c.method === "POST" && !c.url.includes("/data/"))).toHaveLength(0);
  });

  test("without filter_state the chips are not drawn", async () => {
    const plain = PageNodeSchema.parse({ type: "page", id: "t", title: "Today", body: [{ type: "answer_blocks", bind: { source: "package", path: "today" } }] });
    const { findByText, queryByRole } = renderWithQueryClient(
      <MemoryRouter initialEntries={["/apps/news"]}>
        <SchemaPage page={plain} packageId="news" />
      </MemoryRouter>,
    );
    await findByText("Headline 1");
    expect(queryByRole("tab", { name: "Science" })).toBeNull();
  });
});

describe("search node (NEWS-LOOK-02)", () => {
  const recents = [{ key: "recent-aaaaaa", label: "science" }, { key: "recent-bbbbbb", label: "harbor" }];
  const searchNode: UiNode = {
    type: "search",
    label: "Search News",
    placeholder: "Search stories",
    recents: { source: "package", path: "recents", stream: false },
    submit: { navigate: { to: "/apps/news/search", state: { q: "{q}" } } },
    clear_recents: { call: { target: `${P}clear-recents` } },
  };
  const searchPage = PageNodeSchema.parse({
    type: "page",
    id: "s",
    title: "Search",
    body: [searchNode, { type: "answer_blocks", bind: { source: "package", path: "results", params: { q: "$state.q" } } }],
  });
  const resultCalls = () => calls.filter((c) => c.url.endsWith("/data/results"));
  beforeEach(() => {
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.endsWith("/data/recents")) return Promise.resolve(new Response(JSON.stringify({ rows: recents }), { status: 200 }));
      if (url.includes("/data/")) return Promise.resolve(new Response(JSON.stringify({ as_of: "2026-10-17T13:00:00Z", blocks: [feedBlock] }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }) as unknown as typeof fetch;
  });
  const mount = () =>
    renderWithQueryClient(
      <MemoryRouter initialEntries={["/apps/news/search"]}>
        <SchemaPage page={searchPage} packageId="news" />
        <Where />
      </MemoryRouter>,
    );
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  test("typing writes the state key only after the 250 ms pause, with a visible name and nothing sent by the node", async () => {
    const { findByLabelText } = mount();
    const field = (await findByLabelText("Search News")) as HTMLInputElement;
    await waitFor(() => expect(resultCalls()).toHaveLength(1));
    fireEvent.change(field, { target: { value: "sci" } });
    fireEvent.change(field, { target: { value: "science" } });
    await pause(100);
    expect(resultCalls()).toHaveLength(1);
    await waitFor(() => expect(resultCalls()).toHaveLength(2));
    expect(resultCalls()[1]!.body).toEqual({ q: "science" });
    expect(calls.filter((c) => c.url.includes("/actions/"))).toHaveLength(0);
  });

  test("Enter fires submit with the item {q}, filling the navigate state, and an empty field fires nothing", async () => {
    const { findByLabelText, getByTestId } = mount();
    const field = await findByLabelText("Search News");
    fireEvent.keyDown(field, { key: "Enter" });
    await pause(20);
    expect(getByTestId("where").textContent).toBe("/apps/news/search");
    fireEvent.change(field, { target: { value: "  harbor " } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(resultCalls().some((c) => (c.body as { q?: string }).q === "  harbor ")).toBe(true));
    expect(getByTestId("where").textContent).toBe("/apps/news/search");
  });

  test("recents show as chips while the field is empty; a chip sets the state and fires submit", async () => {
    const { findByText, findByLabelText, queryByText } = mount();
    const chip = await findByText("harbor");
    expect(await findByText("science")).toBeTruthy();
    fireEvent.click(chip);
    await waitFor(() => expect(resultCalls().some((c) => (c.body as { q?: string }).q === "harbor")).toBe(true));
    expect(((await findByLabelText("Search News")) as HTMLInputElement).value).toBe("harbor");
    expect(queryByText("science")).toBeNull();
  });

  test("Clear fires clear_recents", async () => {
    const { findByText } = mount();
    fireEvent.click(await findByText("Clear"));
    await waitFor(() => expect(calls.some((c) => c.url === `${P}clear-recents`)).toBe(true));
  });

  test("no recents are drawn when the binding returns no rows, and no Clear either", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.endsWith("/data/recents")) return Promise.resolve(new Response(JSON.stringify({ rows: [] }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ as_of: "2026-10-17T13:00:00Z", blocks: [feedBlock] }), { status: 200 }));
    }) as unknown as typeof fetch;
    const { findByLabelText, container, queryByText } = mount();
    await findByLabelText("Search News");
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/data/recents"))).toBe(true));
    await pause(30);
    expect(container.querySelector('[data-slot="search-recents"]')).toBeNull();
    expect(queryByText("Clear")).toBeNull();
  });
});
