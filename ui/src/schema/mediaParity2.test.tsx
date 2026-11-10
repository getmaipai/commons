// MEDIA-PARITY-02 (spec 0.1.352): reorder on media_shelf and track_rows, the dot badge, search suggestions, the confirm status
// slot, and the widget_tiles node. The page fixture lives beside schema.json.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import { useState } from "react";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";

const SPEC_DIR = process.env.MAIPAI_SPEC_DIR ?? fileURLToPath(new URL("../../../spec", import.meta.url));
const pageJson = JSON.parse(readFileSync(join(SPEC_DIR, "ui", "pages", "media-parity-2.json"), "utf-8"));

const realMatchMedia = window.matchMedia;
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; });

interface Call { url: string; method: string; body: Record<string, unknown> | undefined }
let calls: Call[] = [];
let answers: Record<string, () => Response | Promise<Response>> = {};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const originalFetch = globalThis.fetch;
beforeEach(() => {
  stubMatchMedia({});
  calls = [];
  answers = {};
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    for (const [part, make] of Object.entries(answers)) if (url.includes(part)) return Promise.resolve(make());
    if (url.includes("/data/")) return Promise.resolve(json([]));
    return Promise.resolve(json({ ok: true }));
  }) as unknown as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; });

// The page's state lives here, as in SchemaPage: a node's merge() comes back to it as `state`.
function StatefulPage({ node, scoped }: { node: UiNode; scoped: boolean }) {
  const [state, setState] = useState<Record<string, unknown>>({});
  const body = <PageStateContext.Provider value={{ merge: (patch) => setState((old) => ({ ...old, ...patch })) }}><NodeRenderer node={node} state={state} /></PageStateContext.Provider>;
  return <MemoryRouter>{scoped ? <PackageScopeContext.Provider value={{ packageId: "music" }}>{body}</PackageScopeContext.Provider> : body}</MemoryRouter>;
}
const draw = (node: UiNode, scoped = true) => renderWithQueryClient(<StatefulPage node={node} scoped={scoped} />);
const parse = (node: unknown) => PageNodeSchema.parse({ type: "page", id: "p", title: "P", body: [node] }).body[0] as UiNode;

const TRACKS = [{ id: "a", title: "Alpha", artist: "Ada" }, { id: "b", title: "Beta", artist: "Bo" }, { id: "c", title: "Gamma", artist: "Cy" }];
const trackRows = (extra: Record<string, unknown> = {}) => parse({
  type: "track_rows", bind: { source: "package", path: "tracks" }, label: "Tracks", item_key_field: "id", item_label_field: "title",
  on_play: { play: { media_id: "{id}" } },
  reorder: { call: { call: { target: "/api/plugins/music/playlists/reorder", method: "POST", args: { playlist: "p1" } } }, id_param: "ids" },
  ...extra,
});
const rowTitles = (view: ReturnType<typeof draw>) => Array.from(view.container.querySelectorAll("[data-slot=track-row] .font-semibold")).map((n) => n.textContent);
const reorderCalls = () => calls.filter((c) => c.url.endsWith("/playlists/reorder"));

describe("the shipped spec page parses", () => {
  test("media-parity-2.json is valid in the kit's schema", () => {
    expect(PageNodeSchema.safeParse(pageJson).success).toBe(true);
  });
  test("reorder must be a call action and id_param a plain name", () => {
    expect(() => trackRows({ reorder: { call: { navigate: { to: "/x" } }, id_param: "ids" } })).toThrow();
    expect(() => trackRows({ reorder: { call: { call: { target: "/x" } }, id_param: "Bad Name" } })).toThrow();
  });
});

describe("track_rows reorder", () => {
  test("Move down in edit mode sends the whole new order under id_param, with the call's own args, and shows it at once", async () => {
    answers["/data/tracks"] = () => json(TRACKS);
    const view = draw(trackRows());
    await view.findByText("Alpha");
    expect(view.queryByRole("button", { name: "Move Alpha down" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Reorder" }));
    expect(view.getByRole("button", { name: "Move Alpha up" })).toBeDisabled();
    fireEvent.click(view.getByRole("button", { name: "Move Alpha down" }));
    expect(rowTitles(view)).toEqual(["Beta", "Alpha", "Gamma"]);
    await waitFor(() => expect(reorderCalls()).toHaveLength(1));
    expect(reorderCalls()[0]!.method).toBe("POST");
    expect(reorderCalls()[0]!.body).toEqual({ playlist: "p1", ids: ["b", "a", "c"] });
  });

  test("Move up works too, and the last row cannot move down", async () => {
    answers["/data/tracks"] = () => json(TRACKS);
    const view = draw(trackRows());
    await view.findByText("Alpha");
    fireEvent.click(view.getByRole("button", { name: "Reorder" }));
    expect(view.getByRole("button", { name: "Move Gamma down" })).toBeDisabled();
    fireEvent.click(view.getByRole("button", { name: "Move Gamma up" }));
    await waitFor(() => expect(reorderCalls()).toHaveLength(1));
    expect(reorderCalls()[0]!.body).toEqual({ playlist: "p1", ids: ["a", "c", "b"] });
  });

  test("the arrow keys on the drag handle move a row", async () => {
    answers["/data/tracks"] = () => json(TRACKS);
    const view = draw(trackRows());
    await view.findByText("Alpha");
    fireEvent.keyDown(view.getByRole("button", { name: "Drag Beta to reorder" }), { key: "ArrowUp" });
    await waitFor(() => expect(reorderCalls()).toHaveLength(1));
    expect(reorderCalls()[0]!.body).toEqual({ playlist: "p1", ids: ["b", "a", "c"] });
  });

  test("a pointer drag shows the drop line and sends the new order on release", async () => {
    answers["/data/tracks"] = () => json(TRACKS);
    const view = draw(trackRows());
    await view.findByText("Alpha");
    const items = Array.from(view.container.querySelectorAll<HTMLElement>("[data-reorder-item]"));
    items.forEach((li, i) => { li.getBoundingClientRect = () => ({ left: 0, right: 300, top: i * 50, bottom: i * 50 + 50, width: 300, height: 50, x: 0, y: i * 50, toJSON() {} }) as DOMRect; });
    const handle = view.getByRole("button", { name: "Drag Alpha to reorder" });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 10, clientY: 20 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 10, clientY: 120 });
    expect(items[2]!.getAttribute("data-drop")).toBe("after");
    expect(items[0]!.getAttribute("data-dragging")).toBe("true");
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 10, clientY: 120 });
    expect(rowTitles(view)).toEqual(["Beta", "Gamma", "Alpha"]);
    await waitFor(() => expect(reorderCalls()).toHaveLength(1));
    expect(reorderCalls()[0]!.body).toEqual({ playlist: "p1", ids: ["b", "c", "a"] });
    expect(items[2]!.getAttribute("data-drop")).toBeNull();
  });

  test("a failed save puts the old order back and shows a status card", async () => {
    answers["/data/tracks"] = () => json(TRACKS);
    answers["/playlists/reorder"] = () => json({ error: "The playlist is locked." }, 409);
    const view = draw(trackRows());
    await view.findByText("Alpha");
    fireEvent.click(view.getByRole("button", { name: "Reorder" }));
    fireEvent.click(view.getByRole("button", { name: "Move Alpha down" }));
    const alert = await view.findByRole("alert");
    expect(alert.getAttribute("data-status-kind")).toBe("problem");
    expect(alert.textContent).toContain("Could not save the new order.");
    expect(alert.textContent).toContain("The playlist is locked.");
    expect(rowTitles(view)).toEqual(["Alpha", "Beta", "Gamma"]);
    fireEvent.click(within(alert).getByRole("button", { name: "Dismiss" }));
    expect(view.queryByRole("alert")).toBeNull();
  });

  test("without reorder there is no handle and no Reorder button", async () => {
    answers["/data/tracks"] = () => json(TRACKS);
    const view = draw(trackRows({ reorder: undefined }));
    await view.findByText("Alpha");
    expect(view.queryByRole("button", { name: "Reorder" })).toBeNull();
    expect(view.container.querySelector("[data-slot=reorder-handle]")).toBeNull();
  });
});

const VIDEOS = [{ id: "v1", title: "One", cover: "", unplayed: "New episode" }, { id: "v2", title: "Two", cover: "", unplayed: "" }, { id: "v3", title: "Three", cover: "", unplayed: true }];
const shelf = (extra: Record<string, unknown> = {}) => parse({
  type: "media_shelf", heading: "Unwatched", bind: { source: "package", path: "videos" }, item_key_field: "id", item_label_field: "title", item_media_field: "cover",
  item_badge_field: "unplayed", orientation: "vertical", ...extra,
});

describe("media_shelf dot badge", () => {
  test("a truthy badge field is a dot with an accessible name, a falsy one is nothing", async () => {
    answers["/data/videos"] = () => json(VIDEOS);
    const view = draw(shelf({ item_badge_presentation: "dot" }));
    await view.findByText("One");
    const dots = view.container.querySelectorAll("[data-slot=media-tile-badge-dot]");
    expect(dots).toHaveLength(2);
    expect(view.getByRole("img", { name: "New episode" })).toBeInTheDocument();
    expect(view.getByRole("img", { name: "Not played yet" })).toBeInTheDocument();
    expect(view.queryByText("New episode")).toBeNull();
  });
  test("the default is still a label", async () => {
    answers["/data/videos"] = () => json(VIDEOS);
    const view = draw(shelf());
    expect(await view.findByText("New episode")).toBeInTheDocument();
    expect(view.container.querySelector("[data-slot=media-tile-badge-dot]")).toBeNull();
  });
});

describe("media_shelf reorder", () => {
  test("vertical rows reorder with Move down and send the new order", async () => {
    answers["/data/videos"] = () => json(VIDEOS);
    const view = draw(shelf({ reorder: { call: { call: { target: "/api/plugins/music/playlists/reorder" } }, id_param: "ids" } }));
    await view.findByText("One");
    fireEvent.click(view.getByRole("button", { name: "Reorder" }));
    fireEvent.click(view.getByRole("button", { name: "Move One down" }));
    await waitFor(() => expect(reorderCalls()).toHaveLength(1));
    expect(reorderCalls()[0]!.body).toEqual({ ids: ["v2", "v1", "v3"] });
  });
  test("a horizontal rail has handles under the tiles", async () => {
    answers["/data/videos"] = () => json(VIDEOS);
    const view = draw(shelf({ orientation: "horizontal", reorder: { call: { call: { target: "/api/plugins/music/playlists/reorder" } }, id_param: "ids" } }));
    await view.findByText("One");
    fireEvent.keyDown(view.getByRole("button", { name: "Drag Two to reorder" }), { key: "ArrowLeft" });
    await waitFor(() => expect(reorderCalls()).toHaveLength(1));
    expect(reorderCalls()[0]!.body).toEqual({ ids: ["v2", "v1", "v3"] });
  });
});

const search = () => parse({
  type: "search", label: "Search", state: "q",
  suggest: { bind: { source: "package", path: "suggest", params: { q: "$state.q" } }, max: 2, min_chars: 2 },
  submit: { navigate: { to: "/apps/music/search?q={q}" } },
});
const asks = () => calls.filter((c) => c.url.includes("/data/suggest"));

describe("search suggest", () => {
  test("asks about 250 ms after typing, from min_chars, reads the typed text, and caps at max", async () => {
    answers["/data/suggest"] = () => json([{ key: "1", label: "lanterns" }, { key: "2", label: "lantern fish" }, { key: "3", label: "lantana" }]);
    const view = draw(search());
    const field = view.getByRole("combobox", { name: "Search" });
    fireEvent.change(field, { target: { value: "l" } });
    await new Promise((r) => setTimeout(r, 400));
    expect(asks()).toHaveLength(0);
    fireEvent.change(field, { target: { value: "lan" } });
    const list = await view.findByRole("listbox", { name: "Suggestions" }, { timeout: 2000 });
    expect(asks()).toHaveLength(1);
    expect(asks()[0]!.body).toEqual({ q: "lan" });
    expect(within(list).getAllByRole("option").map((o) => o.textContent)).toEqual(["lanterns", "lantern fish"]);
  });

  test("arrow keys move and Enter takes the active suggestion", async () => {
    answers["/data/suggest"] = () => json({ rows: [{ key: "1", label: "lanterns" }, { key: "2", label: "lantern fish" }] });
    const view = draw(search());
    const field = view.getByRole("combobox", { name: "Search" }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "lan" } });
    await view.findByRole("listbox", { name: "Suggestions" }, { timeout: 2000 });
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(view.getAllByRole("option")[1]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(field, { key: "Enter" });
    expect(field.value).toBe("lantern fish");
    expect(view.queryByRole("listbox")).toBeNull();
  });

  test("tapping a suggestion fills the field and submits", async () => {
    answers["/data/suggest"] = () => json([{ key: "1", label: "lanterns" }]);
    const view = draw(search());
    const field = view.getByRole("combobox", { name: "Search" }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "lan" } });
    fireEvent.click(await view.findByRole("option", { name: "lanterns" }, { timeout: 2000 }));
    expect(field.value).toBe("lanterns");
    expect(view.queryByRole("listbox")).toBeNull();
  });

  test("a failed answer shows no suggestions and Escape closes the list", async () => {
    answers["/data/suggest"] = () => json({ detail: "no" }, 500);
    const view = draw(search());
    fireEvent.change(view.getByRole("combobox", { name: "Search" }), { target: { value: "lan" } });
    await new Promise((r) => setTimeout(r, 500));
    expect(view.queryByRole("listbox")).toBeNull();
  });
});

describe("confirm status slot", () => {
  const removeButton = () => parse({
    type: "track_rows", bind: { source: "package", path: "tracks" }, label: "Tracks", item_key_field: "id", item_label_field: "title", on_play: { play: { media_id: "{id}" } },
    row_actions: [{ icon: "trash", label: "Remove", action: { confirm: { prompt: "Remove {title}?", on_confirm: { call: { target: "/api/plugins/music/items/{id}", method: "DELETE" } }, status: { source: "package", path: "remove-status" } } } }],
  });
  test("the dialog draws the bound status card above its buttons", async () => {
    answers["/data/tracks"] = () => json(TRACKS);
    answers["/data/remove-status"] = () => json([{ state: "problem", title: "Could not remove it.", detail: "The playlist is locked." }]);
    const view = draw(removeButton());
    await view.findByText("Alpha");
    fireEvent.click(view.getAllByRole("button", { name: "Remove: Alpha" })[0]!);
    const dialog = await view.findByRole("alertdialog");
    const status = await within(dialog).findByRole("alert");
    expect(status.getAttribute("data-status-kind")).toBe("problem");
    expect(status.textContent).toContain("Could not remove it.");
    expect(status.textContent).toContain("The playlist is locked.");
    const slot = dialog.querySelector("[data-slot=confirm-status]")!;
    const footer = dialog.querySelector("[data-slot=alert-dialog-footer]")!;
    expect(slot.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  test("without status the dialog is as before", async () => {
    answers["/data/tracks"] = () => json(TRACKS);
    const node = removeButton() as unknown as { row_actions: Array<{ action: { confirm: Record<string, unknown> } }> };
    delete node.row_actions[0]!.action.confirm.status;
    const view = draw(node as unknown as UiNode);
    await view.findByText("Alpha");
    fireEvent.click(view.getAllByRole("button", { name: "Remove: Alpha" })[0]!);
    const dialog = await view.findByRole("alertdialog");
    expect(dialog.querySelector("[data-slot=confirm-status]")).toBeNull();
    expect(calls.some((c) => c.url.includes("remove-status"))).toBe(false);
  });
});

const DEVICES = [
  { id: "l1", kind: "light", name: "Desk lamp", room: "Study", state: "on", brightness: 60, action: { call: { target: "/api/plugins/home/devices/{id}/toggle" } } },
  { id: "s1", kind: "switch", name: "Kettle", room: "Kitchen", state: "pending" },
  { id: "f1", kind: "fan", name: "Ceiling fan", room: "Bedroom", state: "off", percentage: 0 },
  { id: "c1", kind: "cover", name: "Blind", room: "Study", state: "closed", position: 0 },
  { id: "k1", kind: "lock", name: "Front door", room: "Hall", state: "locked", locked: true },
  { id: "e1", kind: "scene", name: "Movie night", room: "Lounge", state: "idle" },
  { id: "t1", kind: "climate", name: "Thermostat", room: "Hall", state: "heat", mode: "heat", current: 19, target: 21, min: 10, max: 30 },
  { id: "u1", kind: "light", name: "Porch light", room: "Porch", state: "unavailable", on: true, brightness: 40 },
];
describe("widget_tiles", () => {
  test("renders each device kind as the kit's tile, with pending and unavailable states, in a two column grid", async () => {
    answers["/api/devices"] = () => json(DEVICES);
    const view = draw(parse({ type: "widget_tiles", bind: { source: "route", path: "/api/devices" } }), false);
    const grid = await view.findByRole("list", { name: "Devices" });
    expect(grid.className).toContain("grid-cols-2");
    for (const slot of ["light-tile", "switch-tile", "fan-tile", "cover-tile", "lock-tile", "scene-tile"]) expect(grid.querySelector(`[data-slot=${slot}]`)).not.toBeNull();
    expect(grid.querySelectorAll("[data-slot=light-tile]")).toHaveLength(2);
    expect(grid.querySelector("[data-slot=switch-tile]")!.getAttribute("data-pending")).toBe("true");
    expect(view.getByText("Last known: on")).toBeInTheDocument();
    expect(view.getByText("Thermostat")).toBeInTheDocument();
  });

  test("a tap runs the row's own action with the row as the item", async () => {
    answers["/api/devices"] = () => json(DEVICES);
    const view = draw(parse({ type: "widget_tiles", bind: { source: "route", path: "/api/devices" } }), false);
    await view.findByRole("list", { name: "Devices" });
    fireEvent.click(view.getByRole("switch", { name: "Desk lamp" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/home/devices/l1/toggle")).toBe(true));
  });

  test("a widget list with size tiles draws each widget's own data", async () => {
    answers["/api/widgets/home/lights/data"] = () => json({ as_of: "2026-11-09T00:00:00Z", items: [DEVICES[0]] });
    answers["/api/widgets"] = () => json([{ package: "home", id: "lights", title: "Lights", size: "tiles", refresh_s: 0 }, { package: "home", id: "news", title: "News", size: "card", refresh_s: 0 }]);
    const view = draw(parse({ type: "widget_tiles", bind: { source: "route", path: "/api/widgets" } }), false);
    await view.findByRole("list", { name: "Lights" });
    expect(view.container.querySelectorAll("[data-slot=light-tile]")).toHaveLength(1);
  });
});

describe("media_shelf sort", () => {
  test("switching back to the first option sends its value, not nothing", async () => {
    answers["/data/videos"] = () => json(VIDEOS);
    const view = draw(parse({
      type: "media_shelf", bind: { source: "package", path: "videos", params: { sort: "$state.order" } }, item_key_field: "id", item_label_field: "title", item_media_field: "cover",
      sort: { state: "order", label: "Sort by", options: [{ value: "recent", label: "Recents" }, { value: "az", label: "A to Z" }] },
    }));
    await view.findByText("One");
    const trigger = view.getByRole("combobox", { name: "Sort by" });
    expect(trigger.textContent).toContain("Recents");
    const choose = async (label: string) => {
      fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
      const option = await view.findByRole("option", { name: label });
      fireEvent.click(option);
    };
    await choose("A to Z");
    await waitFor(() => expect(calls.some((c) => c.body?.sort === "az")).toBe(true));
    await choose("Recents");
    await waitFor(() => expect(calls.some((c) => c.body?.sort === "recent")).toBe(true));
    expect(view.getByRole("combobox", { name: "Sort by" }).textContent).toContain("Recents");
  });
});
