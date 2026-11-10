// QA-FINISH-01 (spec 0.1.353): list.hide_when_empty, call.success_label, the creation_header candidate list, TrackRows on a phone,
// Item/ItemTitle shrinking, and the sleep timer menu above the shell header.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";
import { TrackRows } from "@/kit/primitives/MusicBlocks";
import { DropdownMenuItem } from "@/kit/ui/dropdown-menu";
import { Item, ItemContent, ItemTitle } from "@/kit/dashboard/components/ui/item";
import { SleepTimer } from "@/kit/primitives/SleepTimer";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; });
beforeEach(() => stubMatchMedia({}));

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const answer = (routes: Record<string, unknown>, calls: string[] = []) => {
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    for (const [part, value] of Object.entries(routes)) if (url.includes(part)) return Promise.resolve(json(value));
    return Promise.resolve(json({ ok: true }));
  }) as unknown as typeof fetch;
};
const parse = (node: unknown) => PageNodeSchema.parse({ type: "page", id: "p", title: "P", body: [node] }).body[0] as UiNode;
const draw = (node: UiNode) => renderWithQueryClient(<MemoryRouter><Toaster /><NodeRenderer node={node} /></MemoryRouter>);

const list = (extra: Record<string, unknown> = {}) => parse({ type: "list", bind: { source: "route", path: "/api/things", stream: false }, item_key_field: "id", item_label_field: "name", ...extra });

describe("list.hide_when_empty", () => {
  test("an empty list draws nothing, not even the empty text", async () => {
    answer({ "/api/things": [] });
    const view = draw(list({ hide_when_empty: true }));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(view.queryByText("Nothing here yet.")).toBeNull();
    expect(view.container.querySelector("[data-slot=list]")).toBeNull();
  });
  test("without it the empty text still shows, and rows still show with it", async () => {
    answer({ "/api/things": [] });
    const empty = draw(list());
    await empty.findByText("Nothing here yet.");
    cleanup();
    answer({ "/api/things": [{ id: "a", name: "Alpha" }] });
    const full = draw(list({ hide_when_empty: true }));
    await full.findByText("Alpha");
  });
});

describe("call.success_label", () => {
  const rowAction = (success: boolean) => list({ row_action: { icon: "plus", label: "Save {name}", action: { call: { target: "/api/save", args: { id: "{id}" }, ...(success ? { success_label: "Saved" } : {}) } } } });
  test("a successful call shows the toast", async () => {
    answer({ "/api/things": [{ id: "a", name: "Alpha" }] });
    const view = draw(rowAction(true));
    fireEvent.click(await view.findByRole("button", { name: "Save Alpha" }));
    await waitFor(() => expect(within(document.body).getByText("Saved")).toBeTruthy());
  });
  test("no success_label, no toast", async () => {
    const calls: string[] = [];
    answer({ "/api/things": [{ id: "a", name: "Alpha" }] }, calls);
    const view = draw(rowAction(false));
    const before = toast.getHistory().length;
    fireEvent.click(await view.findByRole("button", { name: "Save Alpha" }));
    await waitFor(() => expect(calls.some((c) => c.startsWith("POST /api/save"))).toBe(true));
    await new Promise((r) => setTimeout(r, 30));
    expect(toast.getHistory().length).toBe(before);
  });
  test("a failed call shows no toast", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => Promise.resolve(String(input).includes("/api/save") ? json({ detail: "no" }, 500) : json([{ id: "a", name: "Alpha" }]))) as unknown as typeof fetch;
    const view = draw(rowAction(true));
    const before = toast.getHistory().length;
    fireEvent.click(await view.findByRole("button", { name: "Save Alpha" }));
    await new Promise((r) => setTimeout(r, 60));
    expect(toast.getHistory().length).toBe(before);
  });
});

describe("creation_header share candidates", () => {
  const header = (extra: Record<string, unknown>) => parse({
    type: "creation_header", bind: { source: "route", path: "/api/header" },
    share_change: { add: { call: { target: "/a" } }, remove: { call: { target: "/a" } }, make_private: { call: { target: "/a" } } }, ...extra,
  });
  const headerRow = { id: "pl-1", title: "Mix", visibility: { mode: "shared", people: [], can_manage: true } };
  test("candidates_bind rows {id, name} are the candidates, never the header rows", async () => {
    answer({ "/api/header": [headerRow], "/api/people": [{ id: "u1", name: "Aster" }, { id: "u2", name: "Basil" }] });
    const view = draw(header({ candidates_bind: { source: "route", path: "/api/people" } }));
    fireEvent.click(await view.findByRole("button", { name: "Shared, manage sharing" }));
    await waitFor(() => expect(within(document.body).getByRole("switch", { name: "Basil" })).toBeTruthy());
    expect(within(document.body).getAllByRole("switch")).toHaveLength(2);
  });
  test("an array bind without candidates_bind does not turn the header row into a candidate", async () => {
    answer({ "/api/header": [headerRow] });
    const view = draw(header({}));
    fireEvent.click(await view.findByRole("button", { name: "Shared, manage sharing" }));
    await waitFor(() => expect(within(document.body).getByRole("dialog")).toBeTruthy());
    expect(within(document.body).queryAllByRole("switch")).toHaveLength(0);
  });
});

describe("TrackRows on a phone", () => {
  const TRACKS = [{ id: "a", title: "A very long track title that must truncate", artist: "Ada", len: "3:10" }, { id: "b", title: "Beta", artist: "Bo", len: "2:00" }];
  const rows = (reorder?: boolean) => (
    <TrackRows
      items={TRACKS} getKey={(t) => t.id} getTitle={(t) => t.title} getSubtitle={(t) => t.artist} getMeta={(t) => t.len} onPlay={() => {}} label="Tracks"
      renderActions={(t) => <button type="button" aria-label={`Remove ${t.title}`}>x</button>}
      renderMenu={(t) => <DropdownMenuItem>{`Remove ${t.id}`}</DropdownMenuItem>}
      reorder={reorder ? { onReorder: () => {} } : undefined}
    />
  );
  test("under sm the row actions become one 44 px More actions button", () => {
    stubMatchMedia({ "(max-width: 39.999rem)": true });
    const view = renderWithQueryClient(rows());
    expect(view.queryByRole("button", { name: /^Remove/ })).toBeNull();
    const more = view.getAllByRole("button", { name: /^More actions for/ });
    expect(more).toHaveLength(2);
    expect(more[0]!.className).toContain("size-11");
    expect(view.container.querySelector("[data-slot=track-row] .truncate")).toBeTruthy();
  });
  test("from sm up the actions stay as buttons", () => {
    const view = renderWithQueryClient(rows());
    expect(view.getAllByRole("button", { name: /^Remove/ })).toHaveLength(2);
    expect(view.queryByRole("button", { name: /^More actions/ })).toBeNull();
  });
  test("reorder mode on a phone keeps only the handle, the title and Move up and down at 44 px", () => {
    stubMatchMedia({ "(max-width: 39.999rem)": true });
    const view = renderWithQueryClient(rows(true));
    fireEvent.click(view.getByRole("button", { name: "Reorder" }));
    expect(view.container.querySelector("[data-slot=track-meta]")).toBeNull();
    expect(view.queryByRole("button", { name: /^More actions/ })).toBeNull();
    for (const play of view.getAllByRole("button", { name: /^Play / })) expect(play.className).toContain("hidden");
    const down = view.getByRole("button", { name: /Move A very long track title.* down/ });
    expect(down.className).toContain("size-11");
    expect(view.container.querySelector("[data-slot=reorder-handle]")!.className).toContain("size-11");
    expect(view.getByText("A very long track title that must truncate").className).toContain("truncate");
  });
});

describe("Item shrinking", () => {
  test("Item content and title can shrink so a long title truncates", () => {
    const view = renderWithQueryClient(<Item><ItemContent><ItemTitle>{"x".repeat(200)}</ItemTitle></ItemContent></Item>);
    expect(view.container.querySelector("[data-slot=item-content]")!.className).toContain("min-w-0");
    const title = view.container.querySelector("[data-slot=item-title]")!.className;
    expect(title).toContain("min-w-0");
    expect(title).toContain("max-w-full");
  });
});

describe("sleep timer menu", () => {
  test("opens above the shell header and keeps clear of the viewport edges", async () => {
    const view = renderWithQueryClient(<SleepTimer value={null} onChange={() => {}} getMedia={() => null} />);
    const trigger = view.getByRole("button", { name: "Sleep timer" });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
    await view.findByRole("menuitemradio", { name: "Off" });
    const menu = document.body.querySelector("[data-slot=dropdown-menu-content]")!;
    expect(menu.className).toContain("z-[var(--z-popover)]");
    expect(menu.className).not.toContain("z-50");
  });
});
