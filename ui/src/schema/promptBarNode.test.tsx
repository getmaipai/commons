// VIDEO-CREATE-01: the prompt_bar node carries the prompt and every chosen value into one action.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import makePage from "../../../spec/ui/pages/videos-make.json";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";

afterEach(cleanup);

interface Call { url: string; method: string; body: unknown }
let calls: Call[] = [];
const originalFetch = globalThis.fetch;
beforeEach(() => {
  calls = [];
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; });

const page = PageNodeSchema.parse(makePage);
const node = page.body[0] as UiNode;

function draw(n: UiNode = node, host: MediaHost | null = null) {
  return renderWithQueryClient(
    <MemoryRouter>
      <PackageScopeContext.Provider value={{ packageId: "videos" }}>
        <MediaHostContext.Provider value={host}>
          <NodeRenderer node={n} state={{}} />
        </MediaHostContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );
}

const cardsNode = {
  type: "prompt_bar",
  label: "Describe your video",
  chips: [
    { state: "look", label: "Look", variant: "cards", default: "none", options: [{ value: "none", label: "Natural" }, { value: "anime", label: "Anime", media: "loops/anime.mp4" }] },
    { state: "length", label: "Length", default: 5, options: [{ value: 5, label: "5 s" }, { value: 10, label: "10 s" }] },
  ],
  references: [{ state: "start_frame", label: "Picture", kind: "picture" }, { state: "who", label: "Character", kind: "character" }],
  submit: { call: { target: "/api/plugins/videos/make", args: { prompt: "{prompt}", look: "{look}", start_frame: "{start_frame}" } } },
} as unknown as UiNode;

describe("prompt_bar node", () => {
  test("the page fixture parses", () => {
    expect(node.type).toBe("prompt_bar");
  });

  test("Make sends prompt, shape, length, tier and recipe in one call with their types", async () => {
    const view = draw();
    const make = view.getByRole("button", { name: "Make" }) as HTMLButtonElement;
    expect(make.disabled).toBe(true);
    fireEvent.change(view.getByRole("textbox", { name: "Describe your video" }), { target: { value: "  a fox in snow  " } });
    fireEvent.click(view.getByRole("radio", { name: "Boost" }));
    const trigger = view.getByRole("combobox", { name: "Camera move" });
    act(() => { fireEvent.keyDown(trigger, { key: "ArrowDown" }); });
    const option = await view.findByRole("option", { name: "Orbit" });
    act(() => { fireEvent.keyDown(option, { key: "Enter" }); });
    fireEvent.click(make);
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/make")).toBe(true));
    const sent = calls.find((c) => c.url === "/api/plugins/videos/make")!;
    expect(sent.method).toBe("POST");
    expect(sent.body).toEqual({ prompt: "a fox in snow", shape: "landscape", length: 5, tier: "boost", recipe: "orbit" });
  });

  test("a failed call shows its message and Make works again", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({ error: "Video is busy. Try again soon." }), { status: 503 }))) as unknown as typeof fetch;
    const view = draw();
    fireEvent.change(view.getByRole("textbox", { name: "Describe your video" }), { target: { value: "a fox" } });
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await view.findByText(/busy|wrong|Try again/i);
    await waitFor(() => expect((view.getByRole("button", { name: "Make" }) as HTMLButtonElement).disabled).toBe(false));
  });

  test("a call outside the package is refused", async () => {
    const bad = { ...(node as object), submit: { call: { target: "/api/plugins/other/make" } } } as UiNode;
    const view = draw(bad);
    fireEvent.change(view.getByRole("textbox", { name: "Describe your video" }), { target: { value: "a fox" } });
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await view.findByText("This page can't do that.");
    expect(calls).toEqual([]);
  });

  test("VIDEO-CREATE-02: a cards chip and references reach one submit; an empty slot is absent; remove clears it", async () => {
    const host: MediaHost = { onPlay: () => {}, pickMedia: (kind) => Promise.resolve({ id: `file-${kind}`, thumb: `/thumb/${kind}.png` }) };
    const view = draw(cardsNode, host);
    expect(view.container.querySelector("video")!.getAttribute("src")).toContain("/api/plugins/videos/assets/loops/anime.mp4");
    fireEvent.change(view.getByRole("textbox", { name: "Describe your video" }), { target: { value: "a fox" } });
    fireEvent.click(view.getByRole("radio", { name: "Anime" }));
    fireEvent.click(view.getByRole("button", { name: "Add Picture" }));
    await view.findByRole("img", { name: "Picture" });
    fireEvent.click(view.getByRole("button", { name: "Add Character" }));
    await view.findByRole("img", { name: "Character" });
    fireEvent.click(view.getByRole("button", { name: "Remove Character" }));
    expect(view.getByRole("button", { name: "Add Character" })).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/make")).toBe(true));
    const sent = calls.find((c) => c.url === "/api/plugins/videos/make")!;
    expect(sent.body).toEqual({ prompt: "a fox", look: "anime", start_frame: "file-picture" });
  });

  test("VIDEO-CREATE-02: without a host media picker the slots are disabled and nothing is added to the submit", async () => {
    const view = draw(cardsNode);
    expect((view.getByRole("button", { name: "Add Picture" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(view.getByRole("textbox", { name: "Describe your video" }), { target: { value: "a fox" } });
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/make")).toBe(true));
    const body = calls.find((c) => c.url === "/api/plugins/videos/make")!.body as Record<string, unknown>;
    expect(body.start_frame).toBe("{start_frame}"); // the call arg stays unfilled: no file id was chosen
    expect(body.look).toBe("none");
  });
});
