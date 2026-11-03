// VIDEO-STUDIO-04: the studio node. Reads one clip row; a locked row is one tile with nothing else read and no request for a source; a clip that relocks
// drops every element it made.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { installFakeMedia } from "../../tests/fakeMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import { StudioNodeSchema, type UiNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;
let calls: { url: string; body: Row }[] = [];
let clip: Row;
let restore: () => void;
const originalFetch = globalThis.fetch;
const realMatchMedia = window.matchMedia;

const clipRow = (extra: Row = {}): Row => ({
  id: "clip-1", title: "Paper boat in the rain", poster: "/p.jpg", locked: false,
  lanes: [
    { id: "video", pieces: [{ id: "p1", ref: "c1", src: "/f/1.mp4", label: "Paper boat A", in_s: 0, out_s: 4, source_s: 10 }, { id: "p2", ref: "c2", src: "/f/2.mp4", label: "Paper boat B", in_s: 0, out_s: 5, source_s: 10 }] },
    { id: "voice", pieces: [] }, { id: "music", pieces: [] },
  ],
  ...extra,
});

beforeEach(() => {
  document.body.replaceChildren(); // other test files leave elements behind; these tests count media elements in the whole document
  restore = installFakeMedia();
  stubMatchMedia({});
  calls = [];
  clip = clipRow();
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Row) : {};
    calls.push({ url, body });
    if (url.endsWith("/data/studio")) return Promise.resolve(new Response(JSON.stringify([clip]), { status: 200 }));
    if (url.endsWith("/f/1.mp4") || url.endsWith("/f/2.mp4") || url.includes("/f/")) return new Promise(() => undefined);
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => { cleanup(); restore(); globalThis.fetch = originalFetch; window.matchMedia = realMatchMedia; });

const node = StudioNodeSchema.parse({
  type: "studio",
  bind: { source: "package", path: "studio", params: { clip: "$state.clip" } },
  fields: { title: "title", poster: "poster", lanes: "lanes", locked: "locked" },
}) as unknown as UiNode;

function Harness({ host = null }: { host?: MediaHost | null }) {
  const [state, setState] = useState<Row>({ clip: "clip-1" });
  return (
    <MemoryRouter>
      <PackageScopeContext.Provider value={{ packageId: "videos" }}>
        <MediaHostContext.Provider value={host}>
          <PageStateContext.Provider value={{ merge: (patch) => setState((prev) => ({ ...prev, ...patch })) }}>
            <NodeRenderer node={node} state={state} />
          </PageStateContext.Provider>
        </MediaHostContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>
  );
}
const pieces = (c: HTMLElement, lane: string) => c.querySelectorAll(`[data-lane="${lane}"] [data-piece]`);

describe("studio node", () => {
  test("draws the clip's lanes from the bound row", async () => {
    const { container, findByRole } = renderWithQueryClient(<Harness />);
    expect(await findByRole("button", { name: /Video piece 1 of 2, Paper boat A/ })).toBeTruthy();
    expect(pieces(container, "video")).toHaveLength(2);
    expect(calls.find((c) => c.url.endsWith("/data/studio"))!.body).toEqual({ clip: "clip-1" });
  });

  test("a locked row is ONE lock tile; the title, poster and lanes are never drawn and no source is requested", async () => {
    clip = clipRow({ locked: true, title: "Zorblax Nightshade", poster: "/zorblax.jpg" });
    const { container, findByRole } = renderWithQueryClient(<Harness />);
    expect(await findByRole("button", { name: "Locked items. Press to enter your passcode." })).toBeTruthy();
    expect(container.textContent).toBe("Locked items");
    expect(document.querySelectorAll("video, audio, img, canvas, [src]")).toHaveLength(0);
    expect(document.body.innerHTML).not.toContain("Zorblax");
    expect(calls.some((c) => c.url.includes("/f/"))).toBe(false);
  });

  test("a clip that relocks after it was open (the host refetches the row) drops every element it made", async () => {
    const { findByRole, queryClient, container } = renderWithQueryClient(<Harness />);
    await findByRole("button", { name: /Video piece 1 of 2/ });
    expect(document.querySelectorAll("video").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[src]").length).toBeGreaterThan(0);
    clip = clipRow({ locked: true });
    await queryClient.invalidateQueries({ queryKey: ["schema-binding"] });
    await waitFor(() => expect(container.textContent).toBe("Locked items"));
    expect(document.querySelectorAll("video, audio, img, canvas, [src]")).toHaveLength(0);
  });

  test("a clip with no row says to pick one", async () => {
    clip = null as unknown as Row;
    globalThis.fetch = mock(() => Promise.resolve(new Response("[]", { status: 200 }))) as unknown as typeof fetch;
    const { findByText } = renderWithQueryClient(<Harness />);
    expect(await findByText("Pick a clip to open it in the Studio.")).toBeTruthy();
  });
});
