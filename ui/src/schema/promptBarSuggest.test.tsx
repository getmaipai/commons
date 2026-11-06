// STYLES-04: the prompt_bar node asks its bound list about 500 ms after typing stops and shows up to two removable chips.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { SchemaPage } from "@/kit/schema/SchemaPage";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { PromptBarNodeSchema } from "@/kit/schema/types";
import type { UiNode } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; });
interface Call { url: string; body: Record<string, unknown> }
let calls: Call[] = [];
let answer: (body: Record<string, unknown>) => Promise<Response> = () => Promise.resolve(json({ rows: [] }));
const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
const originalFetch = globalThis.fetch;
beforeEach(() => {
  stubMatchMedia({});
  calls = [];
  answer = () => Promise.resolve(json({ rows: [] }));
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url: String(input), body });
    if (String(input).includes("/data/")) return answer(body);
    return Promise.resolve(json({ ok: true }));
  }) as unknown as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; });

const STYLE = { id: "lora-secret", name: "Clay look", kind: "style" };
const CHAR = { id: "char-9", name: "Nova", kind: "character" };
const base = {
  type: "prompt_bar", label: "Describe a video",
  chips: [{ state: "style", label: "Styles", variant: "cards", default: "none", quiet_value: "none", private: true, options: [{ value: "none", label: "No style" }, { value: "lora-hand", label: "Hand look" }, { value: "lora-secret", label: "Clay look" }] }],
  style_suggest: { rows: { source: "package", path: "suggest", params: { text: "$state.prompt" } } },
  submit: { call: { target: "/api/plugins/videos/actions/make", args: { prompt: "{prompt}", style: "{style}", character: "{character}" } } },
};
const bar = (over: Record<string, unknown> = {}): UiNode => PromptBarNodeSchema.parse({ ...base, ...over }) as unknown as UiNode;
const draw = (node: UiNode) => renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "videos" }}><NodeRenderer node={node} state={{}} /></PackageScopeContext.Provider></MemoryRouter>);
const type = (view: ReturnType<typeof draw>, text: string) => fireEvent.change(view.getByRole("textbox", { name: "Describe a video" }), { target: { value: text } });
const asks = () => calls.filter((c) => c.url.includes("/data/suggest"));
const makes = () => calls.filter((c) => c.url.includes("/actions/make"));

describe("prompt_bar style_suggest schema", () => {
  test("accepts the shape and rejects bad ones", () => {
    const ok = { rows: { source: "package", path: "suggest" } };
    expect(PromptBarNodeSchema.safeParse({ ...base, style_suggest: { ...ok, max: 1, style_state: "style", character_state: "character" } }).success).toBe(true);
    expect(PromptBarNodeSchema.safeParse({ ...base, style_suggest: { ...ok, max: 3 } }).success).toBe(false);
    expect(PromptBarNodeSchema.safeParse({ ...base, style_suggest: { ...ok, style_state: "Bad" } }).success).toBe(false);
    expect(PromptBarNodeSchema.safeParse({ ...base, style_suggest: { rows: { source: "route", path: "/x" } } }).success).toBe(false);
    expect(PromptBarNodeSchema.safeParse({ ...base, style_suggest: {} }).success).toBe(false);
  });
});

describe("prompt_bar style_suggest behaviour", () => {
  test("asks about 500 ms after typing stops, only from 3 characters, with the prompt in the body", async () => {
    answer = () => Promise.resolve(json({ rows: [STYLE] }));
    const view = draw(bar());
    type(view, "ab");
    await new Promise((r) => setTimeout(r, 700));
    expect(asks()).toHaveLength(0);
    type(view, "a clay fox");
    await new Promise((r) => setTimeout(r, 200));
    expect(asks()).toHaveLength(0);
    const group = await view.findByRole("group", { name: "Suggested styles" }, { timeout: 2000 });
    expect(asks()).toHaveLength(1);
    expect(asks()[0]!.body).toEqual({ text: "a clay fox" });
    expect(group.textContent).toContain("Style: Clay look");
  });

  test("an out-of-date answer is ignored", async () => {
    const pending: Array<(r: Response) => void> = [];
    answer = () => new Promise<Response>((resolve) => { pending.push(resolve); });
    const view = draw(bar());
    type(view, "first words");
    await waitFor(() => expect(pending).toHaveLength(1), { timeout: 2000 });
    type(view, "second words");
    await waitFor(() => expect(pending).toHaveLength(2), { timeout: 2000 });
    pending[1]!(json({ rows: [CHAR] }));
    await view.findByText("Character: Nova");
    pending[0]!(json({ rows: [STYLE] }));
    await new Promise((r) => setTimeout(r, 100));
    expect(view.queryByText("Style: Clay look")).toBeNull();
    expect(view.getByText("Character: Nova")).toBeTruthy();
  });

  test("a failed or empty answer shows no chips and Make still works", async () => {
    answer = () => Promise.resolve(new Response("nope", { status: 500 }));
    const view = draw(bar());
    type(view, "a fox in snow");
    await waitFor(() => expect(asks()).toHaveLength(1), { timeout: 2000 });
    expect(view.queryByRole("group", { name: "Suggested styles" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await waitFor(() => expect(makes()).toHaveLength(1));
    expect(makes()[0]!.body.style).toBe("none");
    expect(makes()[0]!.body.character).toBe("{character}");
  });

  test("a chip left on is sent; a removed chip is not and does not return", async () => {
    answer = () => Promise.resolve(json({ rows: [STYLE, CHAR] }));
    const view = draw(bar());
    type(view, "a clay fox");
    await view.findByRole("group", { name: "Suggested styles" }, { timeout: 2000 });
    fireEvent.click(view.getByRole("button", { name: "Remove style Clay look" }));
    expect(view.queryByText("Style: Clay look")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await waitFor(() => expect(makes()).toHaveLength(1));
    expect(makes()[0]!.body).toMatchObject({ prompt: "a clay fox", style: "none", character: "char-9" });
  });

  test("a removed chip stays away when the same answer comes again for a longer prompt", async () => {
    answer = () => Promise.resolve(json({ rows: [STYLE] }));
    const view = draw(bar());
    type(view, "a clay fox");
    await view.findByText("Style: Clay look", {}, { timeout: 2000 });
    fireEvent.click(view.getByRole("button", { name: "Remove style Clay look" }));
    type(view, "a clay fox runs");
    await waitFor(() => expect(asks()).toHaveLength(2), { timeout: 2000 });
    await new Promise((r) => setTimeout(r, 100));
    expect(view.queryByText("Style: Clay look")).toBeNull();
  });

  test("a hand pick wins: no style chip while the style is chosen by hand, and the pick is sent", async () => {
    answer = () => Promise.resolve(json({ rows: [STYLE, CHAR] }));
    const view = draw(bar());
    fireEvent.click(view.getByRole("radio", { name: "Hand look" }));
    type(view, "a clay fox");
    await view.findByText("Character: Nova", {}, { timeout: 2000 });
    expect(view.queryByText("Style: Clay look")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await waitFor(() => expect(makes()).toHaveLength(1));
    expect(makes()[0]!.body.style).toBe("lora-hand");
  });

  test("a chip showing goes away when the person picks by hand", async () => {
    answer = () => Promise.resolve(json({ rows: [STYLE] }));
    const view = draw(bar());
    type(view, "a clay fox");
    await view.findByText("Style: Clay look", {}, { timeout: 2000 });
    fireEvent.click(view.getByRole("radio", { name: "Hand look" }));
    expect(view.queryByText("Style: Clay look")).toBeNull();
  });

  test("max 1 shows one chip", async () => {
    answer = () => Promise.resolve(json({ rows: [STYLE, CHAR] }));
    const view = draw(bar({ style_suggest: { ...base.style_suggest, max: 1 } }));
    type(view, "a clay fox");
    await view.findByText("Style: Clay look", {}, { timeout: 2000 });
    expect(view.queryByText("Character: Nova")).toBeNull();
  });

  test("rows with the wrong shape are ignored", async () => {
    answer = () => Promise.resolve(json({ rows: [{ id: 5, name: "x", kind: "style" }, { id: "a", name: "A", kind: "other" }, STYLE] }));
    const view = draw(bar());
    type(view, "a clay fox");
    await view.findByText("Style: Clay look", {}, { timeout: 2000 });
    expect(view.queryByText(/Style: x/)).toBeNull();
    expect(view.queryByText(/: A$/)).toBeNull();
  });
});

describe("suggested ids stay out of the address", () => {
  function Where() { const { search } = useLocation(); return <output data-testid="where">{search}</output>; }
  test("neither a showing chip nor the submit puts the id in the address", async () => {
    answer = () => Promise.resolve(json({ rows: [STYLE, CHAR] }));
    const page = { type: "page", id: "p", title: "Create", body: [base] };
    const view = renderWithQueryClient(<MemoryRouter><Where /><SchemaPage page={page} packageId="videos" /></MemoryRouter>);
    type(view as unknown as ReturnType<typeof draw>, "a clay fox");
    await view.findByText("Style: Clay look", {}, { timeout: 2000 });
    fireEvent.click(view.getByRole("button", { name: "Make" }));
    await waitFor(() => expect(makes()).toHaveLength(1));
    const search = view.getByTestId("where").textContent ?? "";
    expect(search).not.toContain("lora-secret");
    expect(search).not.toContain("char-9");
  });
});
