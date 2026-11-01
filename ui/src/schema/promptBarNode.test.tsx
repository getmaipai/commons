// VIDEO-CREATE-01: the prompt_bar node carries the prompt and every chosen value into one action.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import makePage from "../../../spec/ui/pages/videos-make.json";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
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

function draw(n: UiNode = node) {
  return renderWithQueryClient(
    <MemoryRouter>
      <PackageScopeContext.Provider value={{ packageId: "videos" }}>
        <NodeRenderer node={n} state={{}} />
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );
}

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
});
