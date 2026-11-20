// VIDEO-KIT-01: a vertical media_shelf draws its row actions as labelled pills; the subtitle wraps; row_actions are refused on other orientations.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { hub, mountBlock, parseNode } from "../../tests/blockHarness";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
beforeEach(() => stubMatchMedia({}));
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; });

const shelf = (change: Record<string, unknown> = {}) => parseNode({
  type: "media_shelf",
  bind: { source: "package", path: "checks" },
  orientation: "vertical",
  item_key_field: "id",
  item_label_field: "name",
  item_media_field: "picture",
  item_subtitle_field: "{sentence}",
  row_actions: [
    { label: "Use the earlier take", icon: "rotate-ccw", action: { call: { target: "/api/plugins/videos/use-earlier", args: { shot: "{id}" } } } },
    { label: "Make it again", icon: "refresh-cw", action: { call: { target: "/api/plugins/videos/again", args: { shot: "{id}" } } } },
  ],
  ...change,
});
const rows = [{ id: "s3", name: "Shot 3", picture: "", sentence: "Shot 3 still has a frozen picture after one more try. The film is ready with the first take." }];

describe("media_shelf row actions", () => {
  test("a vertical row shows each action with its words beside the icon", async () => {
    hub({ checks: rows });
    const view = mountBlock(shelf());
    await waitFor(() => expect(view.container.querySelector('[data-slot="row-action"]')).not.toBeNull());
    const labels = [...view.container.querySelectorAll('[data-slot="row-action-label"]')].map((e) => e.textContent);
    expect(labels).toEqual(["Use the earlier take", "Make it again"]);
  });
  test("the subtitle wraps to at most three lines instead of one line with an ellipsis", async () => {
    hub({ checks: rows });
    const view = mountBlock(shelf());
    const sub = await waitFor(() => { const e = view.getByText(/frozen picture/); expect(e).toBeTruthy(); return e; });
    expect(sub.className).toContain("line-clamp-3");
    expect(sub.className).not.toContain("truncate");
  });
  test("row_actions on a shelf that is not vertical draw nowhere (documented, not an error)", async () => {
    hub({ checks: rows });
    const view = mountBlock(shelf({ orientation: "horizontal" }));
    await waitFor(() => expect(view.container.querySelector('[data-slot="media-shelf"]')).not.toBeNull());
    expect(view.container.querySelector('[data-slot="row-action"]')).toBeNull();
  });
});
