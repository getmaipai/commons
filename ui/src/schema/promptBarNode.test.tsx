// VIDEO-CREATE-01: the prompt_bar node carries the prompt and every chosen value into one action.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import makePage from "../../../spec/ui/pages/videos-make.json";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; });

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

  test("composer layout reaches the shared Element", () => {
    const composerPage = PageNodeSchema.parse({ type: "page", id: "x", title: "X", body: [{ ...node, layout: "composer" }] });
    const composerNode = composerPage.body[0] as UiNode;
    const view = draw(composerNode);
    expect(view.container.querySelector('[data-slot="prompt-bar"]')?.getAttribute("data-layout")).toBe("composer");
    const chatPage = PageNodeSchema.parse({ type: "page", id: "x", title: "X", body: [{ ...node, layout: "chat" }] });
    const chatView = draw(chatPage.body[0] as UiNode);
    expect(chatView.container.querySelector('[data-slot="prompt-bar"]')?.getAttribute("data-layout")).toBe("chat");
    const composer = view.container.querySelector('[data-slot="prompt-bar-composer"]')!;
    expect(composer.querySelector('textarea[aria-label="Describe your video"]')).toBeTruthy();
    expect(composer.querySelector('button[type="submit"]')).toBeTruthy();
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

// VIDEO-UI-03: the node carries the new props through, and the bar follows the page state (K6).
const panelNode = {
  type: "prompt_bar",
  label: "Describe your video",
  placement: "panel",
  starts: "video",
  submit_label: "Generate",
  suggestions: [{ label: "Fox", text: "A fox in snow" }],
  submit_detail: { state: "tier", labels: { standard: "Under a minute", boost: "About a minute" } },
  chips: [
    { state: "look", label: "Look", variant: "cards", presentation: "popover", group: "Style", default: "none", options: [{ value: "none", label: "Natural" }, { value: "anime", label: "Anime", media: "loops/anime.mp4" }] },
    { state: "length", label: "Length", default: 5, options: [{ value: 5, label: "5 s" }, { value: 10, label: "10 s" }] },
  ],
  tier: { state: "tier", tiers: [{ id: "standard", label: "Standard" }, { id: "boost", label: "Boost" }] },
  references: [{ state: "start_frame", label: "Start frame", kind: "picture", placement: "in_field" }, { state: "voice", label: "Voice clip", kind: "audio" }],
  submit: { call: { target: "/api/plugins/videos/make", args: { prompt: "{prompt}", look: "{look}", tier: "{tier}", start_frame: "{start_frame}", voice: "{voice}" } } },
} as unknown as UiNode;

function drawWith(n: UiNode, state: Record<string, unknown>, host: MediaHost | null = null) {
  const tree = (s: Record<string, unknown>) => (
    <MemoryRouter>
      <PackageScopeContext.Provider value={{ packageId: "videos" }}>
        <MediaHostContext.Provider value={host}>
          <NodeRenderer node={n} state={s} />
        </MediaHostContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>
  );
  const view = renderWithQueryClient(tree(state));
  return { view, update: (s: Record<string, unknown>) => view.rerender(<QueryClientProvider client={view.queryClient}>{tree(s)}</QueryClientProvider>) };
}

describe("prompt_bar node, VIDEO-UI-03", () => {
  test("the new props parse and a panel bar outside a split_view draws as the inline bar", () => {
    expect(() => PageNodeSchema.parse({ type: "page", id: "x", title: "X", body: [panelNode] })).not.toThrow();
    const { view } = drawWith(panelNode, {});
    expect(view.container.querySelector('[data-slot="prompt-bar"]')!.hasAttribute("data-mode")).toBe(false);
    expect(view.getByRole("button", { name: "Fox" })).toBeTruthy();
    expect(view.container.querySelector('[data-slot="prompt-bar-detail"]')!.textContent).toBe("Under a minute");
  });

  test("inside a split_view at lg it is the panel, Generate sends the in-field and audio ids, the detail follows the tier", async () => {
    stubMatchMedia({ "(min-width: 960px)": true });
    const split = { type: "split_view", aside_side: "start", main: [{ type: "empty_state", icon: "film", text: "Feed" }], aside: [panelNode] } as unknown as UiNode;
    const host: MediaHost = { onPlay: () => {}, pickMedia: (kind) => Promise.resolve({ id: `file-${kind}`, thumb: `/t/${kind}.png` }) };
    const { view } = drawWith(split, {}, host);
    expect(view.container.querySelector('[data-slot="prompt-bar"]')!.getAttribute("data-mode")).toBe("panel");
    fireEvent.change(view.getByRole("textbox", { name: "Describe your video" }), { target: { value: "a fox" } });
    fireEvent.click(view.getByRole("button", { name: "Add Start frame" }));
    await view.findByRole("img", { name: "Start frame" });
    fireEvent.click(view.getByRole("button", { name: "Add Voice clip" }));
    await view.findByRole("button", { name: "Remove Voice clip" });
    fireEvent.click(view.getByRole("radio", { name: "Boost" }));
    expect(view.container.querySelector('[data-slot="prompt-bar-detail"]')!.textContent).toBe("About a minute");
    fireEvent.click(view.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/make")).toBe(true));
    expect(calls.find((c) => c.url === "/api/plugins/videos/make")!.body).toEqual({ prompt: "a fox", look: "none", tier: "boost", start_frame: "file-picture", voice: "file-audio" });
  });

  test("K8: a making notice disables Generate but leaves the prompt and choices available", () => {
    const off: MediaHost = { onPlay: () => {}, makingNotice: (kind) => (kind === "video" ? "Video is not ready yet. Try again in a minute." : undefined) };
    const blocked = drawWith(panelNode, {}, off).view;
    expect(blocked.getByText("Video is not ready yet. Try again in a minute.")).toBeTruthy();
    expect((blocked.getByRole("textbox", { name: "Describe your video" }) as HTMLTextAreaElement).disabled).toBe(false);
    expect((blocked.getByRole("button", { name: /Style/ }) as HTMLButtonElement).disabled).toBe(false);
    cleanup();
    const picture = drawWith({ ...(panelNode as object), starts: "picture" } as UiNode, {}, off).view;
    expect((picture.getByRole("textbox", { name: "Describe your video" }) as HTMLTextAreaElement).disabled).toBe(false);
    cleanup();
    const unmarked = drawWith({ ...(panelNode as object), starts: undefined } as UiNode, {}, off).view;
    expect((unmarked.getByRole("textbox", { name: "Describe your video" }) as HTMLTextAreaElement).disabled).toBe(false);
  });

  test("K6: chips, tier, references and words arrive from page state on first render", () => {
    const { view } = drawWith(panelNode, { prompt: "a fox", look: "anime", length: 10, tier: "boost", start_frame: "f9" });
    expect((view.getByRole("textbox", { name: "Describe your video" }) as HTMLTextAreaElement).value).toBe("a fox");
    expect(view.getByRole("combobox", { name: "Length" }).textContent).toContain("10 s");
    expect(view.getByRole("radio", { name: "Boost" }).getAttribute("aria-checked")).toBe("true");
    expect(view.getByRole("button", { name: "Remove Start frame" })).toBeTruthy();
    expect(view.container.querySelector('[data-slot="prompt-bar-detail"]')!.textContent).toBe("About a minute");
    expect(view.getByRole("button", { name: /Style/ }).textContent).toContain("Anime");
  });

  test("K6: a later navigation to the same page (Remix) refills the bar while it is mounted", () => {
    const { view, update } = drawWith(panelNode, { prompt: "a fox", look: "none", tier: "standard" });
    update({ prompt: "a whale", look: "anime", length: 10, tier: "boost", start_frame: "f2" });
    expect((view.getByRole("textbox", { name: "Describe your video" }) as HTMLTextAreaElement).value).toBe("a whale");
    expect(view.getByRole("combobox", { name: "Length" }).textContent).toContain("10 s");
    expect(view.getByRole("radio", { name: "Boost" }).getAttribute("aria-checked")).toBe("true");
    expect(view.getByRole("button", { name: /Style/ }).textContent).toContain("Anime");
    expect(view.getByRole("button", { name: "Remove Start frame" })).toBeTruthy();
  });
});

describe("prompt_bar and split_view node, VIDEO-UI-12", () => {
  test("the roomy props parse and reach the kit: wide aside, large box, tile with hint, tier cards with time, time in the button", () => {
    stubMatchMedia({ "(min-width: 960px)": true });
    const bar = { ...(panelNode as object), field_size: "large", submit_detail: { state: "tier", placement: "in_button", labels: { standard: "Under a minute", boost: "About a minute" } }, references: [{ state: "start_frame", label: "Start frame", kind: "picture", placement: "tile", hint: "Optional. Begin from a picture." }], tier: { state: "tier", presentation: "cards", tiers: [{ id: "standard", label: "Standard", hint: "Fast" }, { id: "boost", label: "Boost", hint: "Sharper" }] } };
    const split = { type: "split_view", aside_side: "start", aside_width: "wide", main: [{ type: "empty_state", icon: "film", text: "Feed" }], aside: [bar] } as unknown as UiNode;
    expect(() => PageNodeSchema.parse({ type: "page", id: "x", title: "X", body: [split] })).not.toThrow();
    const { view } = drawWith(split, {});
    expect(view.container.querySelector('[data-slot="split-view"]')!.getAttribute("data-aside-width")).toBe("wide");
    expect(view.container.querySelector("textarea")!.className).toContain("5lh");
    expect(view.getByRole("button", { name: "Add Start frame" }).getAttribute("data-slot")).toBe("prompt-bar-tile");
    expect(view.container.querySelector('[data-presentation="cards"]')).toBeTruthy();
    expect(view.getByRole("button", { name: "Generate" }).textContent).toContain("Under a minute");
    expect(view.container.querySelector('[data-slot="tier-card-time"]')!.textContent).toBe("Under a minute");
  });
});
