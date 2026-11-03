// VIDEO-STUDIO-04 and -05: the studio node. Reads one clip row, a locked row is one tile with nothing else read, the export call carries the
// plan as JSON and its reply id drives the export card, the add call's reply becomes a piece.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
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
let job: Row | null;
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
  job = null;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Row) : {};
    calls.push({ url, body });
    if (url.endsWith("/data/studio")) return Promise.resolve(new Response(JSON.stringify([clip]), { status: 200 }));
    if (url.endsWith("/data/job")) return Promise.resolve(new Response(JSON.stringify(job ? [job] : []), { status: 200 }));
    if (url.endsWith("/actions/export")) return Promise.resolve(new Response(JSON.stringify({ id: "job-7" }), { status: 200 }));
    if (url.endsWith("/actions/add")) return Promise.resolve(new Response(JSON.stringify({ ref: "n1", src: "/f/n1.wav", label: "A new voice", duration_s: 2.5 }), { status: 200 }));
    if (url.endsWith("/f/1.mp4") || url.endsWith("/f/2.mp4") || url.includes("/f/")) return new Promise(() => undefined);
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => { cleanup(); restore(); globalThis.fetch = originalFetch; window.matchMedia = realMatchMedia; });

const node = StudioNodeSchema.parse({
  type: "studio",
  bind: { source: "package", path: "studio", params: { clip: "$state.clip" } },
  handlers: { export: { call: { target: "/api/plugins/videos/actions/export", args: { clip: "{clip}", plan: "{plan}" } } }, add: { call: { target: "/api/plugins/videos/actions/add", args: { clip: "{clip}", kind: "{kind}" } } } },
  export_result: { bind: { source: "package", path: "job", params: { id: "$state.export_id" } }, fields: { status: "status", words: "words" }, poll_while: { statuses: ["queued", "generating"], record: { path: "job", params: { id: "{id}" } } }, actions: [{ label: "Open in My clips", action: { navigate: { to: "/apps/videos/clips" } } }] },
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

  test("Export posts the plan as JSON (not a string) and its reply id opens the job's card", async () => {
    const { container, findByRole, findByText } = renderWithQueryClient(<Harness />);
    await findByRole("button", { name: /Video piece 1 of 2/ });
    fireEvent.click(pieces(container, "video")[1]!);
    fireEvent.click(await findByRole("button", { name: "Delete piece" }));
    job = { id: "job-7", status: "generating", words: "Making your clip" };
    fireEvent.click(await findByRole("button", { name: "Export as a new clip" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/actions/export"))).toBe(true));
    const post = calls.find((c) => c.url.endsWith("/actions/export"))!;
    expect(post.body.clip).toBe("clip-1");
    const plan = post.body.plan as { version: number; video: { pieces: { ref: string }[] } };
    expect(typeof plan).toBe("object");
    expect(plan.version).toBe(1);
    expect(plan.video.pieces.map((p) => p.ref)).toEqual(["c1"]);
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/data/job") && c.body.id === "job-7")).toBe(true));
    expect(await findByText("Keep editing")).toBeTruthy();
  });

  test("Add a voice: the host's picker names the file, the call's reply becomes a piece in the Voice lane", async () => {
    const pickMedia = mock(async (kind: string) => ({ id: kind === "audio" ? "file-3" : "x" }));
    const { container, findByRole } = renderWithQueryClient(<Harness host={{ onPlay: () => undefined, pickMedia } as unknown as MediaHost} />);
    await findByRole("button", { name: /Video piece 1 of 2/ });
    fireEvent.click(await findByRole("button", { name: "Add a voice" }));
    await waitFor(() => expect(pieces(container, "voice")).toHaveLength(1));
    expect(pickMedia).toHaveBeenCalledWith("audio");
    expect(calls.find((c) => c.url.endsWith("/actions/add"))!.body).toEqual({ clip: "clip-1", kind: "voice" });
  });

  test("a clip with no row says to pick one", async () => {
    clip = null as unknown as Row;
    globalThis.fetch = mock(() => Promise.resolve(new Response("[]", { status: 200 }))) as unknown as typeof fetch;
    const { findByText } = renderWithQueryClient(<Harness />);
    expect(await findByText("Pick a clip to open it in the Studio.")).toBeTruthy();
  });
});
