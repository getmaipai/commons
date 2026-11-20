import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { calls, hub, mountBlock, parseNode } from "../../tests/blockHarness";

const actions = [
  { icon: "bookmark", label: "Save {name}", action: { call: { target: "/api/plugins/videos/save", args: { id: "{id}" } } } },
  { icon: "play", label: "Play {name}", group: "Listen", action: { call: { target: "/api/plugins/videos/play", args: { id: "{id}" } } } },
  { icon: "trash", label: "Remove {name}", group: "Listen", action: { call: { target: "/api/plugins/videos/remove", args: { id: "{id}" } } } },
];
const node = (layout: "rail" | "grid" = "grid", orientation: "horizontal" | "vertical" = "horizontal", row_actions: unknown[] = actions) => parseNode({ type: "media_shelf", bind: { source: "package", path: "checks" }, item_key_field: "id", item_label_field: "name", item_media_field: "picture", layout, orientation, on_select: { call: { target: "/api/plugins/videos/select" } }, row_actions });
const originalMatchMedia = window.matchMedia;
beforeEach(() => { stubMatchMedia({}); hub({ checks: [{ id: "a", name: "Alpha", picture: "", enabled: true }] }); });
afterEach(() => { cleanup(); window.matchMedia = originalMatchMedia; });

describe("media_shelf tile actions", () => {
  test("rail/grid open labelled actions, group as one submenu and dispatch row", async () => {
    for (const layout of ["rail", "grid"] as const) {
      const view = mountBlock(node(layout));
      const trigger = await view.findByRole("button", { name: "More actions for Alpha" });
      trigger.focus(); fireEvent.keyDown(trigger, { key: "Enter" });
      expect(await view.findByRole("menuitem", { name: "Save Alpha" })).toBeTruthy();
      expect(view.getByRole("menuitem", { name: "Listen" })).toBeTruthy();
      fireEvent.keyDown(view.getByRole("menuitem", { name: "Listen" }), { key: "ArrowRight" });
      expect(await view.findByRole("menuitem", { name: "Play Alpha" })).toBeTruthy();
      fireEvent.click(view.getByRole("menuitem", { name: "Play Alpha" }));
      await waitFor(() => expect(calls.some((call) => call.url.includes("/play") && JSON.stringify(call.body).includes("\"id\":\"a\""))).toBe(true));
      expect(calls.some((call) => call.url.includes("/select"))).toBe(false);
      view.unmount();
    }
  });
  test("conditional actions disappear per row; vertical remains a row button; empty actions have no menu", async () => {
    const conditional = [{ ...actions[0], show_when_field: "enabled" }, { ...actions[1], hide_when_field: "enabled" }];
    const view = mountBlock(node("grid", "horizontal", conditional));
    { const trigger = await view.findByRole("button", { name: "More actions for Alpha" }); trigger.focus(); fireEvent.keyDown(trigger, { key: "Enter" }); }
    expect(await view.findByRole("menuitem", { name: "Save Alpha" })).toBeTruthy();
    expect(view.queryByRole("menuitem", { name: "Play Alpha" })).toBeNull();
    view.unmount();
    const empty = mountBlock(node("grid", "horizontal", [{ ...actions[0], show_when_field: "missing" }]));
    await waitFor(() => expect(empty.container.querySelector('[data-slot="media-shelf"]')).not.toBeNull());
    expect(empty.container.querySelector('[data-slot="media-shelf-tile-menu-trigger"]')).toBeNull();
    empty.unmount();
    const vertical = mountBlock(node("rail", "vertical"));
    expect(await vertical.findByRole("button", { name: "Save Alpha: Alpha" })).toBeTruthy();
    expect(vertical.container.querySelector('[data-slot="media-shelf-tile-menu-trigger"]')).toBeNull();
  });
  test("Enter opens and Escape closes to the trigger", async () => {
    const view = mountBlock(node());
    const trigger = await view.findByRole("button", { name: "More actions for Alpha" });
    trigger.focus(); fireEvent.keyDown(trigger, { key: "Enter" });
    expect(await view.findByRole("menuitem", { name: "Save Alpha" })).toBeTruthy();
    fireEvent.keyDown(view.getByRole("menuitem", { name: "Save Alpha" }), { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
