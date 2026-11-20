// UI-BLOCKS-01: the `action_bar` node maps `primary` and `secondary` to the kit ActionBar, words its line from the first bound row, and runs the actions.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { calls, fixtureNode, hub, mountBlock, parseNode } from "../../tests/blockHarness";
import { ActionBarNodeSchema } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
beforeEach(() => stubMatchMedia({}));
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; });

const plan = [{ estimate: "About 45 minutes to render", reason: null }];
const node = (change: Record<string, unknown> = {}) => fixtureNode("action-bar.json", change);
const button = (view: ReturnType<typeof mountBlock>, name: string) => view.getByRole("button", { name }) as HTMLButtonElement;

describe("action_bar node", () => {
  test("the example page parses, and an estimate with no bind is refused", () => {
    const parsed = ActionBarNodeSchema.parse(node());
    expect(parsed.primary.busy_state).toBe("rendering");
    expect(ActionBarNodeSchema.safeParse({ type: "action_bar", primary: parsed.primary, estimate: "estimate" }).success).toBe(false);
    expect(ActionBarNodeSchema.safeParse({ type: "action_bar", primary: parsed.primary }).success).toBe(true);
  });

  test("draws the two buttons and the server's estimate from the first row", async () => {
    hub({ "render-plan": plan });
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    expect(await view.findByText("About 45 minutes to render")).toBeTruthy();
    expect(button(view, "Render film").disabled).toBe(false);
    expect(button(view, "Save as draft").disabled).toBe(false);
    expect(view.container.querySelector('[data-slot="action-bar"]')?.hasAttribute("data-sticky")).toBe(true);
  });

  test("a note is a plain helper line that never disables the primary action", async () => {
    hub({ "render-plan": [{ estimate: "About 45 minutes to render", reason: null, note: "Shots you kept stay as they are." }] });
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    expect(await view.findByText("Shots you kept stay as they are.")).toBeTruthy();
    expect(view.container.querySelector('[data-slot="action-bar-note"]')).not.toBeNull();
    expect(button(view, "Render film").disabled).toBe(false);
    expect(view.getByText("About 45 minutes to render")).toBeTruthy();
  });

  test("a note with no bind is refused", () => {
    const parsed = ActionBarNodeSchema.parse(node());
    expect(ActionBarNodeSchema.safeParse({ type: "action_bar", primary: parsed.primary, note: "note" }).success).toBe(false);
  });

  test("an answered empty list draws nothing", async () => {
    hub({ "render-plan": [] });
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    await waitFor(() => expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(0));
    expect(view.container.querySelector('[data-slot="action-bar"]')).toBeNull();
  });

  test("the page's params reach the data call", async () => {
    hub({ "render-plan": plan });
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    await view.findByText("About 45 minutes to render");
    const body = (globalThis.fetch as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock.calls[0]![1].body;
    expect(JSON.parse(String(body))).toEqual({ id: "f1" });
  });

  test("a reason replaces the estimate and stops the primary action", async () => {
    hub({ "render-plan": [{ estimate: "About 45 minutes to render", reason: "Add a shot first, then render." }] });
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    expect(await view.findByText("Add a shot first, then render.")).toBeTruthy();
    expect(view.queryByText("About 45 minutes to render")).toBeNull();
    expect(button(view, "Render film").disabled).toBe(true);
    expect(button(view, "Save as draft").disabled).toBe(false);
  });

  test("disabled_when reads the page state: the primary waits until `ready`", async () => {
    hub({ "render-plan": plan });
    const view = mountBlock(node(), { state: { film: "f1" } });
    await view.findByText("About 45 minutes to render");
    expect(button(view, "Render film").disabled).toBe(true);
  });

  test("the primary runs its call with the page state and the row as placeholders", async () => {
    hub({ "render-plan": plan });
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    await view.findByText("About 45 minutes to render");
    fireEvent.click(button(view, "Render film"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/render")).toBe(true));
    expect(calls.find((c) => c.url === "/api/plugins/videos/render")!.body).toEqual({ film: "f1" });
  });

  test("busy_state: set while the call runs (busy label, no second press, the secondary's own condition) and cleared after", async () => {
    hub({ "render-plan": plan });
    const answer = globalThis.fetch;
    let finish: () => void = () => {};
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/render")) return new Promise<Response>((resolve) => { finish = () => resolve(new Response("{}")); calls.push({ url: String(input), method: "POST", body: undefined }); });
      return answer(input, init);
    }) as typeof fetch;
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    await view.findByText("About 45 minutes to render");
    fireEvent.click(button(view, "Render film"));
    await waitFor(() => expect(view.state().rendering).toBe(true));
    const busy = button(view, "Rendering");
    expect(busy.disabled).toBe(true);
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(button(view, "Save as draft").disabled).toBe(true);
    fireEvent.click(busy);
    expect(calls.filter((c) => c.url.endsWith("/render"))).toHaveLength(1);
    finish();
    await waitFor(() => expect("rendering" in view.state()).toBe(false));
    expect(button(view, "Render film").disabled).toBe(false);
    expect(button(view, "Save as draft").disabled).toBe(false);
  });

  test("a busy_state the page already set shows the busy label and cannot be pressed", async () => {
    hub({ "render-plan": plan });
    const view = mountBlock(node(), { state: { film: "f1", ready: true, rendering: true } });
    await view.findByText("About 45 minutes to render");
    expect(button(view, "Rendering").disabled).toBe(true);
  });

  test("a confirm action does not set busy_state (a cancel would leave it set)", async () => {
    hub({ "render-plan": plan });
    const confirming = node({ primary: { label: "Render film", action: { confirm: { prompt: "Render now?", on_confirm: { call: { target: "/api/plugins/videos/render" } } } }, busy_state: "rendering" } });
    const view = mountBlock(confirming, { state: { film: "f1" } });
    await view.findByText("About 45 minutes to render");
    fireEvent.click(button(view, "Render film"));
    expect(view.state().rendering).toBeUndefined();
  });

  test("a failed action says why under the bar", async () => {
    hub({ "render-plan": plan });
    const answer = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => String(input).endsWith("/render")
      ? Promise.resolve(new Response(JSON.stringify({ error: "The renderer is busy. Try again in a minute." }), { status: 503 }))
      : answer(input, init)) as typeof fetch;
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    await view.findByText("About 45 minutes to render");
    fireEvent.click(button(view, "Render film"));
    expect((await view.findByRole("alert")).textContent).toBe("The renderer is busy. Try again in a minute.");
  });

  test("while the first answer is loading the primary waits and no line is drawn", async () => {
    hub({ "render-plan": "hang" });
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    await waitFor(() => expect(button(view, "Render film").disabled).toBe(true));
    expect(view.container.querySelector('[data-slot="action-bar-line"]')).toBeNull();
  });

  test("a failed data call gives the kit's retry line", async () => {
    hub({ "render-plan": "fail" });
    const view = mountBlock(node(), { state: { film: "f1", ready: true } });
    await view.findByText("Something went wrong.");
    expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  test("with no bind the bar is just its buttons, and sticky false is not sticky", async () => {
    hub({});
    const bare = parseNode({ type: "action_bar", primary: { label: "Go", action: { call: { target: "/api/plugins/videos/go" } } }, sticky: false });
    const view = mountBlock(bare);
    fireEvent.click(button(view, "Go"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/go")).toBe(true));
    expect(view.container.querySelector('[data-slot="action-bar"]')?.hasAttribute("data-sticky")).toBe(false);
  });

  test("a disabled_when that cannot be read keeps the button off instead of unmounting the page", async () => {
    hub({ "render-plan": plan });
    const view = mountBlock(node({ primary: { label: "Render film", action: { call: { target: "/api/plugins/videos/render" } }, disabled_when: "ready && other" } }), { state: { ready: true } });
    await view.findByText("About 45 minutes to render");
    expect(button(view, "Render film").disabled).toBe(true);
  });
});
