// VIDEO-LORA-09: the Styles chips of the Create page's prompt bar (docs/design/video-loras-2026-11-02.md 6.2): a chosen card's note, the one lock tile,
// a chip that works only at some levels (disabled with one plain line, and sending nothing), and a quiet default in the group's summary.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SchemaPage } from "@/kit/schema/SchemaPage";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { PromptBarNodeSchema } from "@/kit/schema/types";
import type { UiNode } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; });
interface Call { url: string; body: Record<string, unknown> }
let calls: Call[] = [];
const originalFetch = globalThis.fetch;
beforeEach(() => {
  stubMatchMedia({});
  calls = [];
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : {} });
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; });

const REASON = "Styles are for Max for now. Choose Max to use one.";
function bar(over: { styles?: Record<string, unknown>; tier?: boolean } = {}): UiNode {
  return PromptBarNodeSchema.parse({
    type: "prompt_bar",
    label: "Describe a video",
    chips: [
      { state: "style", label: "Styles", variant: "cards", default: "none", quiet_value: "none", enabled_tiers: ["max"], disabled_reason: REASON, locked: true,
        options: [{ value: "none", label: "No style" }, { value: "lora-a", label: "Clay look", note: "Makes your clip look like clay stop motion. It adds two phrases." }], ...over.styles },
      { state: "strength", label: "Strength", default: "normal", quiet_value: "normal", enabled_tiers: ["max"], options: [{ value: "less", label: "Less" }, { value: "normal", label: "Normal" }, { value: "more", label: "More" }] },
    ],
    ...(over.tier === false ? {} : { tier: { state: "tier", default: "standard", tiers: [{ id: "standard", label: "Standard" }, { id: "max", label: "Max" }] } }),
    submit: { call: { target: "/api/plugins/videos/actions/make", args: { prompt: "{prompt}", style: "{style}", strength: "{strength}", tier: "{tier}" } } },
  }) as unknown as UiNode;
}
const draw = (node: UiNode) => renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "videos" }}><NodeRenderer node={node} state={{}} /></PackageScopeContext.Provider></MemoryRouter>);

describe("prompt_bar Styles chips", () => {
  test("below Max the chip is disabled with its one plain line and the lock tile is not offered", () => {
    const view = draw(bar());
    expect(view.getByText(REASON)).toBeTruthy();
    for (const radio of view.getAllByRole("radio", { name: /No style|Clay look/ })) expect((radio as HTMLInputElement).getAttribute("aria-disabled") === "true" || (radio as HTMLButtonElement).disabled).toBe(true);
    expect(view.queryByRole("button", { name: /Locked items/ })).toBeNull();
  });

  test("at Max the cards work, the chosen card's note shows, and the lock tile stands for the hidden styles", () => {
    const view = draw(bar());
    fireEvent.click(view.getByRole("radio", { name: "Max" }));
    expect(view.queryByText(REASON)).toBeNull();
    expect(view.getByRole("button", { name: /Locked items/ })).toBeTruthy();
    fireEvent.click(view.getByRole("radio", { name: "Clay look" }));
    expect(view.getByText("Makes your clip look like clay stop motion. It adds two phrases.")).toBeTruthy();
  });

  test("no lock tile when the chip says nothing is locked", () => {
    const view = draw(bar({ styles: { locked: false } }));
    fireEvent.click(view.getByRole("radio", { name: "Max" }));
    expect(view.queryByRole("button", { name: /Locked items/ })).toBeNull();
  });

  test("Make sends the chosen style and strength at Max, and sends neither below Max", async () => {
    const view = draw(bar());
    fireEvent.change(view.getByRole("textbox", { name: "Describe a video" }), { target: { value: "a fox in snow" } });
    // Standard: a stale choice is never sent.
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.body).toMatchObject({ prompt: "a fox in snow", tier: "standard" });
    // An argument with no value is left as its own `{name}` placeholder, which the server reads as "not given" (readMakeBody).
    expect(calls[0]!.body.style).toBe("{style}");
    expect(calls[0]!.body.strength).toBe("{strength}");
    fireEvent.click(view.getByRole("radio", { name: "Max" }));
    fireEvent.click(view.getByRole("radio", { name: "Clay look" }));
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]!.body).toMatchObject({ style: "lora-a", strength: "normal", tier: "max" });
  });

  test("a bar with no level segment treats a chip with enabled_tiers as the Standard level", () => {
    const view = draw(bar({ tier: false }));
    expect(view.getByText(REASON)).toBeTruthy();
  });
});

describe("a private chip stays out of the address", () => {
  function Where() { const { search } = useLocation(); return <output data-testid="where">{search}</output>; }
  const page = (isPrivate: boolean) => ({
    type: "page", id: "p", title: "Create", body: [{
      type: "prompt_bar", label: "Describe a video",
      chips: [
        { state: "style", label: "Styles", variant: "cards", default: "none", ...(isPrivate ? { private: true } : {}), options: [{ value: "none", label: "No style" }, { value: "lora-secret", label: "Clay look" }] },
        { state: "look", label: "Look", variant: "cards", default: "natural", options: [{ value: "natural", label: "Natural" }, { value: "anime", label: "Anime" }] },
      ],
      submit: { call: { target: "/api/plugins/videos/actions/make" } },
    }],
  });
  const open = (isPrivate: boolean) => renderWithQueryClient(<MemoryRouter><Where /><SchemaPage page={page(isPrivate)} packageId="videos" /></MemoryRouter>);

  test("the choice is in page state and the submit, never in the address; an ordinary chip still is", async () => {
    const view = open(true);
    fireEvent.click(view.getByRole("radio", { name: "Clay look" }));
    fireEvent.click(view.getByRole("radio", { name: "Anime" }));
    await waitFor(() => expect(view.getByTestId("where").textContent).toContain("look=anime"));
    expect(view.getByTestId("where").textContent).not.toContain("lora-secret");
    expect(view.getByTestId("where").textContent).not.toContain("style=");
  });

  test("without private the id would be written (the behaviour the flag exists to stop)", async () => {
    const view = open(false);
    fireEvent.click(view.getByRole("radio", { name: "Clay look" }));
    await waitFor(() => expect(view.getByTestId("where").textContent).toContain("style=lora-secret"));
  });
});
